import { Conversation } from '@/modules/conversation/conversation.model';
import { Message } from '@/modules/conversation/message.model';
import * as conversationService from '@/modules/conversation/conversation.service';
import { createTestUser } from '../../helpers/factories';
import { AppError } from '@/shared/errors/AppError';

describe('Conversation Service Unit Tests', () => {
  it('should successfully create a conversation', async () => {
    const user = await createTestUser();
    const con = await conversationService.createConversation(
      user._id.toString(),
      'gemini-1.5-flash',
      'Test Chat',
      'You are a helpful assistant'
    );

    expect(con).toBeTruthy();
    expect(con.title).toBe('Test Chat');
    expect(con.model).toBe('gemini-1.5-flash');
    expect(con.systemPrompt).toBe('You are a helpful assistant');
    expect(con.userId.toString()).toBe(user._id.toString());
  });

  it('should get paginated conversation list for a user', async () => {
    const user = await createTestUser();
    const userId = user._id.toString();

    const c1 = await conversationService.createConversation(userId, 'gemini-1.5-flash', 'Chat 1');
    const c2 = await conversationService.createConversation(userId, 'gemini-1.5-flash', 'Chat 2');

    console.log('CREATED CONVERSATIONS:', { c1: c1.toObject(), c2: c2.toObject() });

    const allInDb = await Conversation.find({});
    console.log('ALL CONVERSATIONS IN DB:', allInDb.map(c => c.toObject()));

    const res = await conversationService.getConversationsList(userId, 1, 10);
    console.log('GET CONVERSATIONS LIST RESULT:', res.conversations.map(c => c.toObject()));

    expect(res.conversations.length).toBe(2);
    expect(res.meta.total).toBe(2);
  });

  it('should get conversation details and messages', async () => {
    const user = await createTestUser();
    const userId = user._id.toString();
    const con = await conversationService.createConversation(userId, 'gemini-1.5-flash', 'Chat 1');

    // Add a message
    await Message.create({
      conversationId: con._id,
      userId: user._id,
      role: 'user',
      content: 'Hello AI',
      tokensUsed: 10,
      creditsDeducted: 0.02,
    });

    const details = await conversationService.getConversationDetails(userId, con._id.toString());
    expect(details.conversation._id.toString()).toBe(con._id.toString());
    expect(details.messages.length).toBe(1);
    expect(details.messages[0].content).toBe('Hello AI');
  });

  it('should throw error when getting non-existent conversation details', async () => {
    const user = await createTestUser();
    const fakeId = '507f1f77bcf86cd799439011';

    await expect(
      conversationService.getConversationDetails(user._id.toString(), fakeId)
    ).rejects.toThrow(AppError);
  });

  it('should update conversation properties successfully', async () => {
    const user = await createTestUser();
    const con = await conversationService.createConversation(
      user._id.toString(),
      'gemini-1.5-flash',
      'Old Title'
    );

    const updated = await conversationService.updateConversation(
      user._id.toString(),
      con._id.toString(),
      {
        title: 'New Title',
        isPinned: true,
      }
    );

    expect(updated.title).toBe('New Title');
    expect(updated.isPinned).toBe(true);
  });

  it('should archive a conversation successfully', async () => {
    const user = await createTestUser();
    const con = await conversationService.createConversation(
      user._id.toString(),
      'gemini-1.5-flash',
      'Old Title'
    );

    const archived = await conversationService.archiveConversation(
      user._id.toString(),
      con._id.toString()
    );
    expect(archived.isArchived).toBe(true);
  });

  it('should get conversation messages with pagination', async () => {
    const user = await createTestUser();
    const userId = user._id.toString();
    const con = await conversationService.createConversation(userId, 'gemini-1.5-flash', 'Chat');

    await Message.create({
      conversationId: con._id,
      userId: user._id,
      role: 'user',
      content: 'Msg 1',
      tokensUsed: 5,
      creditsDeducted: 0.01,
    });

    await Message.create({
      conversationId: con._id,
      userId: user._id,
      role: 'assistant',
      content: 'Response 1',
      tokensUsed: 10,
      creditsDeducted: 0.02,
    });

    const res = await conversationService.getConversationMessages(userId, con._id.toString(), 1, 1);
    expect(res.messages.length).toBe(1);
    expect(res.messages[0].content).toBe('Msg 1');
    expect(res.meta.total).toBe(2);
    expect(res.meta.totalPages).toBe(2);
  });

  it('should clear messages of a conversation and reset counters', async () => {
    const user = await createTestUser();
    const userId = user._id.toString();
    const con = await conversationService.createConversation(userId, 'gemini-1.5-flash', 'Chat');

    await Message.create({
      conversationId: con._id,
      userId: user._id,
      role: 'user',
      content: 'Msg 1',
      tokensUsed: 5,
      creditsDeducted: 0.01,
    });

    con.messageCount = 1;
    con.totalTokensUsed = 5;
    await con.save();

    await conversationService.clearConversationMessages(userId, con._id.toString());

    const updatedCon = await Conversation.findById(con._id);
    expect(updatedCon?.messageCount).toBe(0);
    expect(updatedCon?.totalTokensUsed).toBe(0);

    const messages = await Message.find({ conversationId: con._id });
    expect(messages.length).toBe(0);
  });
});
