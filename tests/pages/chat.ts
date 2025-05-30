import { expect, type Page } from '@playwright/test';

export class ChatPage {
  constructor(private page: Page) {}

  public get sendButton() {
    return this.page.getByTestId('send-button');
  }

  public get stopButton() {
    return this.page.getByTestId('stop-button');
  }

  public get multimodalInput() {
    return this.page.getByTestId('multimodal-input');
  }

  public get scrollContainer() {
    return this.page.locator('.overflow-y-scroll');
  }

  public get scrollToBottomButton() {
    return this.page.getByTestId('scroll-to-bottom-button');
  }

  async createNewChat() {
    await this.page.goto('/');
  }

  public getCurrentURL(): string {
    return this.page.url();
  }

  async sendUserMessage(message: string) {
    await this.multimodalInput.click();
    await this.multimodalInput.fill(message);
    await this.sendButton.click();
  }

  async isGenerationComplete() {
    const response = await this.page.waitForResponse((response) =>
      response.url().includes('/api/chat'),
    );

    await response.finished();
  }

  async isVoteComplete() {
    const response = await this.page.waitForResponse((response) =>
      response.url().includes('/api/vote'),
    );

    await response.finished();
  }

  async hasChatIdInUrl() {
    await expect(this.page).toHaveURL(
      /^http:\/\/localhost:3000\/chat\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  }

  async sendUserMessageFromSuggestion() {
    await this.page
      .getByRole('button', { name: 'What are the advantages of' })
      .click();
  }

  async isElementVisible(elementId: string) {
    await expect(this.page.getByTestId(elementId)).toBeVisible();
  }

  async isElementNotVisible(elementId: string) {
    await expect(this.page.getByTestId(elementId)).not.toBeVisible();
  }

  async getRecentAssistantMessage() {
    const messageElements = await this.page
      .getByTestId('message-assistant')
      .all();
    const lastMessageElement = messageElements[messageElements.length - 1];

    const content = await lastMessageElement
      .getByTestId('message-content')
      .innerText()
      .catch(() => null);

    const reasoningElement = await lastMessageElement
      .getByTestId('message-reasoning')
      .isVisible()
      .then(async (visible) =>
        visible
          ? await lastMessageElement
              .getByTestId('message-reasoning')
              .innerText()
          : null,
      )
      .catch(() => null);

    return {
      element: lastMessageElement,
      content,
      reasoning: reasoningElement,
      async toggleReasoningVisibility() {
        await lastMessageElement
          .getByTestId('message-reasoning-toggle')
          .click();
      },
      async upvote() {
        await lastMessageElement.getByTestId('message-upvote').click();
      },
      async downvote() {
        await lastMessageElement.getByTestId('message-downvote').click();
      },
    };
  }

  async getRecentUserMessage() {
    const messageElements = await this.page.getByTestId('message-user').all();
    const lastMessageElement = messageElements.at(-1);

    if (!lastMessageElement) {
      throw new Error('No user message found');
    }

    const content = await lastMessageElement
      .getByTestId('message-content')
      .innerText()
      .catch(() => null);

    const hasAttachments = await lastMessageElement
      .getByTestId('message-attachments')
      .isVisible()
      .catch(() => false);

    const attachments = hasAttachments
      ? await lastMessageElement.getByTestId('message-attachments').all()
      : [];

    const page = this.page;

    return {
      element: lastMessageElement,
      content,
      attachments,
      async edit(newMessage: string) {
        await page.getByTestId('message-edit-button').click();
        await page.getByTestId('message-editor').fill(newMessage);
        await page.getByTestId('message-editor-send-button').click();
        // Wait for the generation to complete (stop button turns back to send button)
        await expect(page.getByTestId('send-button')).toBeVisible();
      },
    };
  }

  async expectToastToContain(text: string) {
    await expect(this.page.getByTestId('toast')).toContainText(text);
  }

  async openSideBar() {
    const sidebarToggleButton = this.page.getByTestId('sidebar-toggle-button');
    await sidebarToggleButton.click();
  }

  public async isScrolledToBottom(): Promise<boolean> {
    return this.scrollContainer.evaluate(
      (el) => Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 1,
    );
  }

  public async waitForScrollToBottom(timeout = 5_000): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await this.isScrolledToBottom()) return;
      await this.page.waitForTimeout(100);
    }

    throw new Error(`Timed out waiting for scroll bottom after ${timeout}ms`);
  }

  public async sendMultipleMessages(
    count: number,
    makeMessage: (i: number) => string,
  ) {
    for (let i = 0; i < count; i++) {
      await this.sendUserMessage(makeMessage(i));
      await this.isGenerationComplete();
    }
  }

  public async scrollToTop(): Promise<void> {
    await this.scrollContainer.evaluate((element) => {
      element.scrollTop = 0;
    });
  }
}
