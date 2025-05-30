import { ChatPage } from '../pages/chat';
import { test, expect } from '../fixtures';
import { TEST_PROMPTS } from '../prompts/basic';

test.describe('Chat activity', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test('Send a user message and receive response', async () => {
    await chatPage.sendUserMessage(TEST_PROMPTS.TEST_PROMPT_2.MESSAGE.content);
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toContain(
      TEST_PROMPTS.TEST_PROMPT_2.RESPONSE,
    );
  });

  test('Redirect to /chat/:id after submitting message', async () => {
    await chatPage.sendUserMessage(TEST_PROMPTS.TEST_PROMPT_2.MESSAGE.content);
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toContain(
      TEST_PROMPTS.TEST_PROMPT_2.RESPONSE,
    );
    await chatPage.hasChatIdInUrl();
  });

  // test('Send a user message from suggestion', async () => {
  //   await chatPage.sendUserMessageFromSuggestion();
  //   await chatPage.isGenerationComplete();

  //   const assistantMessage = await chatPage.getRecentAssistantMessage();
  //   expect(assistantMessage.content).toContain(
  //     'With Next.js, you can ship fast!',
  //   );
  // });

  test('Toggle between send/stop button based on activity', async () => {
    await expect(chatPage.sendButton).toBeVisible();
    await expect(chatPage.sendButton).toBeDisabled();

    await chatPage.sendUserMessage(TEST_PROMPTS.TEST_PROMPT_2.MESSAGE.content);

    await expect(chatPage.sendButton).not.toBeVisible();
    await expect(chatPage.stopButton).toBeVisible();

    await chatPage.isGenerationComplete();

    await expect(chatPage.stopButton).not.toBeVisible();
    await expect(chatPage.sendButton).toBeVisible();
  });

  test('Stop generation during submission', async () => {
    await chatPage.sendUserMessage(TEST_PROMPTS.TEST_PROMPT_2.MESSAGE.content);
    await expect(chatPage.stopButton).toBeVisible();
    await chatPage.stopButton.click();
    await expect(chatPage.sendButton).toBeVisible();
  });

  test('Edit user message and resubmit', async () => {
    await chatPage.sendUserMessage(TEST_PROMPTS.TEST_PROMPT_2.MESSAGE.content);
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toContain(
      TEST_PROMPTS.TEST_PROMPT_2.RESPONSE,
    );

    const userMessage = await chatPage.getRecentUserMessage();
    await userMessage.edit(TEST_PROMPTS.TEST_PROMPT_1.MESSAGE.content);

    await chatPage.isGenerationComplete();

    const updatedAssistantMessage = await chatPage.getRecentAssistantMessage();
    expect(updatedAssistantMessage.content).toContain(
      TEST_PROMPTS.TEST_PROMPT_1.RESPONSE,
    );
  });

  test('Hide suggested actions after sending message', async () => {
    await chatPage.isElementVisible('suggested-actions');
    await chatPage.sendUserMessageFromSuggestion();
    await chatPage.isElementNotVisible('suggested-actions');
  });

  test('Upvote message', async () => {
    await chatPage.sendUserMessage(TEST_PROMPTS.TEST_PROMPT_1.MESSAGE.content);
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    await assistantMessage.upvote();
    await chatPage.isVoteComplete();
  });

  test('Downvote message', async () => {
    await chatPage.sendUserMessage(TEST_PROMPTS.TEST_PROMPT_1.MESSAGE.content);
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    await assistantMessage.downvote();
    await chatPage.isVoteComplete();
  });

  test('Update vote', async () => {
    await chatPage.sendUserMessage(TEST_PROMPTS.TEST_PROMPT_1.MESSAGE.content);
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    await assistantMessage.upvote();
    await chatPage.isVoteComplete();

    await assistantMessage.downvote();
    await chatPage.isVoteComplete();
  });

  test('Create message from url query', async ({ page }) => {
    await page.goto(`/?query=${TEST_PROMPTS.TEST_PROMPT_1.MESSAGE.content}`);

    await chatPage.isGenerationComplete();

    const userMessage = await chatPage.getRecentUserMessage();
    expect(userMessage.content).toBe(
      TEST_PROMPTS.TEST_PROMPT_1.MESSAGE.content,
    );

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toContain(
      TEST_PROMPTS.TEST_PROMPT_1.RESPONSE,
    );
  });

  test('auto-scrolls to bottom after submitting new messages', async () => {
    await chatPage.sendMultipleMessages(5, (i) => `Test prmopt ${i}`);
    await chatPage.waitForScrollToBottom();
  });

  test('scroll button appears when user scrolls up, hides on click', async () => {
    await chatPage.sendMultipleMessages(5, (i) => `Test prompt${i}`);
    await expect(chatPage.scrollToBottomButton).not.toBeVisible();

    await chatPage.scrollToTop();
    await expect(chatPage.scrollToBottomButton).toBeVisible();

    await chatPage.scrollToBottomButton.click();
    await chatPage.waitForScrollToBottom();
    await expect(chatPage.scrollToBottomButton).not.toBeVisible();
  });
});
