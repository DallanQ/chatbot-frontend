export const DEFAULT_CHAT_MODEL: string = 'default-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'default-model',
    name: 'Default model',
    description: 'Primary model for all-purpose chat',
  },
  {
    id: 'large-model',
    name: 'Large model',
    description: 'Uses advanced reasoning',
  },
];
