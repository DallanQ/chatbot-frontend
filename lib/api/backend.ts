/**
 * Backend API Integration Module
 * 
 * This module provides utilities for interacting with the custom backend API.
 * It handles authentication, request formatting, and response processing.
 * 
 * IMPORTANT: This code only runs on the server side and should never be imported
 * directly in client components.
 */

import { type DataStreamWriter } from 'ai';
import { generateUUID } from '@/lib/utils';

// Type for backend request options
export type BackendRequestOptions = {
  headers?: Record<string, string>;
  timeout?: number;
};

// Error class for backend request failures
export class BackendError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'BackendError';
  }
}

/**
 * Make a standard request to the backend API
 */
export async function callBackend<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<T> {
  const apiBaseUrl = process.env.API_BASE_URL;
  const apiSecret = process.env.API_SECRET;
  
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is not defined');
  }
  
  if (!apiSecret) {
    throw new Error('API_SECRET is not defined');
  }
  
  const { method = 'GET', body, headers = {}, timeout = 30000 } = options;
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const url = `${apiBaseUrl}${path}`;
    const fetchHeaders = new Headers(headers);
    fetchHeaders.set('Authorization', `Bearer ${apiSecret}`);
    
    if (body && !fetchHeaders.has('Content-Type')) {
      fetchHeaders.set('Content-Type', 'application/json');
    }
    
    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new BackendError(`API request failed with status ${response.status}`, response.status);
    }
    
    // If response is expected to be JSON
    if (response.headers.get('content-type')?.includes('application/json')) {
      return await response.json() as T;
    }
    
    // For non-JSON responses (like streams), return the response directly
    return response as unknown as T;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new BackendError('Request timed out', 408);
    }
    
    // Re-throw backend errors
    if (error instanceof BackendError) {
      throw error;
    }
    
    // Handle other errors
    throw new BackendError(error.message || 'Unknown error', 500);
  }
}

/**
 * Generate a title using the backend
 */
export async function generateTitleWithBackend(message: string): Promise<string> {
  try {
    const result = await callBackend<{ text: string }>('/api/generate_title', {
      method: 'POST',
      body: { message }
    });
    
    return result.text;
  } catch (error) {
    console.error('Error generating title with backend:', error);
    // Fallback to a generic title
    return 'New conversation';
  }
}

/**
 * Stream text from the backend chat API
 * Returns an object with methods to consume and merge the stream, similar to streamText
 */
export async function streamFromBackend(
  params: {
    messages: any[];
    userId: string;
    userType: string;
    chatId: string;
    onFinish?: ({ response }: { response: any }) => Promise<void>;
  }
): Promise<{ consumeStream: () => void; mergeIntoDataStream: (dataStream: DataStreamWriter, options?: any) => void }> {
  // Extract the onFinish callback and pass the rest to the backend
  const { onFinish, ...otherParams } = params;
  
  // Extract content from messages, removing parts
  const simplifiedMessages = params.messages.map(message => {
    // Ensure content field exists - might be in parts[0].text for some messages
    const content = message.content || 
      (message.parts && message.parts[0] && message.parts[0].text) ||
      '';
    
    return {
      role: message.role,
      content: content
    };
  });
  
  // Real backend API call
  const response = await callBackend<Response>('/api/chat', {
    method: 'POST',
    body: {
      ...otherParams,
      messages: simplifiedMessages
    }
  });
  
  if (!response.body) {
    throw new Error('No response body available');
  }
  
  // Track the complete response for onFinish callback
  const responseData = {
    textParts: [] as string[]
  };
  
  // Create a transform stream that simply passes through the data from backend 
  // but also collects text parts for the onFinish callback
  const createPassthroughStream = () => {
    return new TransformStream({
      transform(chunk, controller) {
        if (typeof chunk !== 'string') {
          // Convert Uint8Array to string if needed
          chunk = new TextDecoder().decode(chunk);
        }
        // Pass through the chunk as-is
        controller.enqueue(chunk);
        
        // Try to extract text content for the response object
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) continue;
          
          const type = line.substring(0, colonIndex);
          const content = line.substring(colonIndex + 1);
          
          if (type === '0') {
            // Text chunk - add to our collected text parts
            try {
              const textContent = JSON.parse(content);
              responseData.textParts.push(textContent);
            } catch (e) {
              console.error('Error in text chunk handling:', e);
            }
          }
        }
      }
    });
  };
  
  // Set up objects to manage the stream consumption
  // These mirror the interface returned by streamText
  let isMerged = false;
  let isConsumed = false;
  
  return {
    consumeStream: () => {
      // Mark as consumed to prevent duplicate consumption
      isConsumed = true;
    },
    
    mergeIntoDataStream: (ds: DataStreamWriter, options: any = {}) => {
      // Prevent merging twice
      if (isMerged) {
        return;
      }
      isMerged = true;
      
      try {
        // Create a fresh copy of the response body as a stream
        // and process it through our transform stream
        const backendStream = response.body;
        // We've already checked response.body is not null above, but TypeScript needs reassurance
        if (!backendStream) {
          throw new Error('Response body stream is null');
        }
        
        // Process the backend stream through our transform
        const processedStream = backendStream
          .pipeThrough(createPassthroughStream());
        
        // Create two identical streams - one for merging, one for monitoring
        const [streamForMerge, streamForMonitor] = processedStream.tee();
        
        // Prepare the final stream for merging
        const formattedStream = streamForMerge.pipeThrough(new TextEncoderStream());
        
        // If merge method exists, use it to connect our stream to the data stream
        if (typeof ds.merge === 'function') {
          // Use type assertion to tell TypeScript this is the correct format
          ds.merge(formattedStream as any);
          
          // Setup onFinish handler for when the stream completes
          if (onFinish) {
            // Use the monitoring stream to detect completion
            const reader = streamForMonitor.getReader();
            (async () => {
              try {
                while (true) {
                  const { done } = await reader.read();
                  if (done) {
                    await onFinish({ response: responseData });
                    break;
                  }
                }
              } catch (err) {
                console.error('Error monitoring stream:', err);
              } finally {
                reader.releaseLock();
              }
            })();
          }
        } else {
          // Fallback to manually reading the stream and writing to data stream
          const reader = formattedStream.getReader();
          
          (async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  // If we have an onFinish callback, call it with the collected response
                  if (onFinish) {
                    await onFinish({ response: responseData });
                  }
                  break;
                }
                
                try {
                  // Write the value to the data stream
                  if (typeof value === 'string') {
                    ds.writeData(value);
                  } else {
                    // Convert Uint8Array to string before writing to the data stream
                    const decodedValue = new TextDecoder().decode(value);
                    ds.writeData(decodedValue);
                  }
                } catch (error) {
                  console.error(`Error processing chunk:`, error);
                }
              }
            } catch (err) {
              console.error('Error reading stream:', err);
            } finally {
              reader.releaseLock();
            }
          })();
        }
      } catch (error) {
        console.error('Error in backend stream:', error);
        
        // Handle different error types
        let errorMessage = 'Failed to connect to backend service';
        
        if (error instanceof BackendError) {
          switch (error.status) {
            case 400:
              errorMessage = 'Bad request to backend';
              break;
            case 401:
              errorMessage = 'Unauthorized request to backend';
              break;
            case 403:
              errorMessage = 'Forbidden request to backend';
              break;
            case 429:
              errorMessage = 'Rate limit exceeded on backend';
              break;
            case 408:
              errorMessage = 'Request to backend timed out';
              break;
            case 422:
              errorMessage = 'Invalid request format (422 Unprocessable Entity)';
              break;
            default:
              errorMessage = 'An error occurred with the backend service';
          }
        }
        
        // Write the error directly to the data stream
        ds.writeData({
          type: 'error',
          error: errorMessage
        });
        
        // If onFinish exists, call it with an empty response
        if (onFinish) {
          onFinish({ response: { textParts: [] } }).catch(e => {
            console.error('Error in onFinish handler:', e);
          });
        }
      }
    }
  };
}
