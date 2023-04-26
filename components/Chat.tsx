import * as React from 'react';
import { shallow } from 'zustand/shallow';

import { Box, useTheme } from '@mui/joy';
import { SxProps } from '@mui/joy/styles/types';

import { ApiPublishResponse } from '../pages/api/publish';
import { ApplicationBar } from '@/components/ApplicationBar';
import { ChatMessageList } from '@/components/ChatMessageList';
import { ChatModelId, SystemPurposeId, SystemPurposes } from '@/lib/data';
import { Composer } from '@/components/Composer';
import { ConfirmationModal } from '@/components/dialogs/ConfirmationModal';
import { Link } from '@/components/util/Link';
import { PublishedModal } from '@/components/dialogs/PublishedModal';
import { createDMessage, DMessage, downloadConversationJson, Questions, useChatStore } from '@/lib/store-chats';
import { publishConversation } from '@/lib/publish';
import { requireUserKeyElevenLabs } from '@/components/dialogs/SettingsModal';
import { speakText } from '@/lib/text-to-speech';
import { streamAssistantMessage, updateAutoConversationTitle, callGetQuestions, callGetAnswers } from '@/lib/ai';
import { useSettingsStore } from '@/lib/store-settings';
import { strict } from 'assert';


/**
 * The main "chat" function. TODO: this is here so we can soon move it to the data model.
 */

const getAllQuestionsFromAI = async (conversationId: string, history: DMessage[], assistantModel: ChatModelId, language: string) => {

  // reference the state editing functions
  const { startTyping, appendMessage, editMessage, setMessages, stopTyping, setQuestions, setQuestionIndex } = useChatStore.getState();
  const onFirstParagraph = !requireUserKeyElevenLabs ? speakText : undefined;

  setMessages(conversationId, history);

  // create a blank and 'typing' message for the assistant
  let assistantMessageId: string;
  {
    const assistantMessage: DMessage = createDMessage('assistant', 'Assigining Interviewer');
    assistantMessage.typing = true;
    assistantMessage.purposeId = history[0].purposeId;
    assistantMessage.originLLM = 'Interviewer';
    appendMessage(conversationId, assistantMessage);
    assistantMessageId = assistantMessage.id;
  }

  // when an abort controller is set, the UI switches to the "stop" mode
  const controller = new AbortController();
  startTyping(conversationId, controller);

  await callGetQuestions(conversationId, history, language, controller.signal, assistantMessageId, editMessage, setQuestions, setQuestionIndex, assistantModel, onFirstParagraph);

  

  // clear to send, again
  startTyping(conversationId, null);
}

const runAssistantUpdatingState = async (conversationId: string, history: DMessage[], assistantModel: ChatModelId, assistantPurpose: SystemPurposeId, questions: Questions[], index: number, userText: string) => {

  // reference the state editing functions
  const { startTyping, appendMessage, editMessage, setMessages, setQuestionIndex } = useChatStore.getState();

  // update the purpose of the system message (if not manually edited), and create if needed
  {
    const systemMessageIndex = history.findIndex(m => m.role === 'system');
    const systemMessage: DMessage = systemMessageIndex >= 0 ? history.splice(systemMessageIndex, 1)[0] : createDMessage('system', '');

    if (!systemMessage.updated) {
      systemMessage.purposeId = assistantPurpose;
      systemMessage.text = SystemPurposes[assistantPurpose]?.systemMessage
        .replaceAll('{{Today}}', new Date().toISOString().split('T')[0]);
    }

    history.unshift(systemMessage);
    setMessages(conversationId, history);
  }

  // create a blank and 'typing' message for the assistant
  let assistantMessageId: string;
  {
    const assistantMessage: DMessage = createDMessage('assistant', '...');
    assistantMessage.typing = true;
    assistantMessage.purposeId = history[0].purposeId;
    assistantMessage.originLLM = 'Interviewer';
    appendMessage(conversationId, assistantMessage);
    assistantMessageId = assistantMessage.id;
  }

  // if the server has an API key, we can use text-to-speech of the first paragraph (will be user-driven soon)
  const onFirstParagraph = !requireUserKeyElevenLabs ? speakText : undefined;

  //console.log('Now....');
  //console.log(questions);


  // when an abort controller is set, the UI switches to the "stop" mode
  const controller = new AbortController();
  startTyping(conversationId, controller);

  if (index < questions.length) {
    await callGetAnswers(conversationId, controller.signal, assistantMessageId, editMessage, userText, questions[index].question);
  }

  // clear to send, again
  startTyping(conversationId, null);

  editMessage(conversationId, assistantMessageId, { typing: false }, false);


  // create a blank and 'typing' message for the assistant
  let assistantNewMessageId: string;
  {
    const assistantNewMessage: DMessage = createDMessage('assistant', '...');
    assistantNewMessage.typing = true;
    assistantNewMessage.purposeId = history[0].purposeId;
    assistantNewMessage.originLLM = 'gpt-3.5';
    appendMessage(conversationId, assistantNewMessage);
    assistantNewMessageId = assistantNewMessage.id;
  }

  startTyping(conversationId, controller);

  const newIndex = index + 1;
  if (newIndex >= questions.length) {
    editMessage(conversationId, assistantNewMessageId, { text: "Thank you for your answers, no further questions." }, false);
  }
  else{
    editMessage(conversationId, assistantNewMessageId, { text: questions[newIndex].question }, false);
  }
  setQuestionIndex(conversationId, newIndex);

  //const { apiKey, apiHost, apiOrganizationId, modelTemperature, modelMaxResponseTokens } = useSettingsStore.getState();
  //await streamAssistantMessage(conversationId, assistantMessageId, history, apiKey, apiHost, apiOrganizationId, assistantModel, modelTemperature, modelMaxResponseTokens, editMessage, controller.signal, onFirstParagraph);

  // clear to send, again
  startTyping(conversationId, null);

  editMessage(conversationId, assistantNewMessageId, { typing: false }, false);

  // update text, if needed
  //await updateAutoConversationTitle(conversationId);
};


export function Chat(props: { onShowSettings: () => void, sx?: SxProps }) {
  // state
  const [publishConversationId, setPublishConversationId] = React.useState<string | null>(null);
  const [publishResponse, setPublishResponse] = React.useState<ApiPublishResponse | null>(null);

  // external state
  const theme = useTheme();
  const { activeConversationId, chatModelId, systemPurposeId } = useChatStore(state => {
    const conversation = state.conversations.find(conversation => conversation.id === state.activeConversationId);
    return {
      activeConversationId: state.activeConversationId,
      chatModelId: conversation?.chatModelId ?? null,
      systemPurposeId: conversation?.systemPurposeId ?? null,
    };
  }, shallow);


  const _findConversation = (conversationId: string) =>
    conversationId ? useChatStore.getState().conversations.find(c => c.id === conversationId) ?? null : null;


  const handleSendMessage = async (conversationId: string, userText: string) => {
    const conversation = _findConversation(conversationId);
    if (conversation && chatModelId && systemPurposeId)
      await runAssistantUpdatingState(conversation.id, [...conversation.messages, createDMessage('user', userText)], chatModelId, systemPurposeId, conversation.questions, conversation.currentQuestionIndex, userText);
  };

  const handleRestartConversation = async (conversationId: string, history: DMessage[]) => {
    const conversation = _findConversation(conversationId);
    if (conversationId && chatModelId && systemPurposeId)
      await runAssistantUpdatingState(conversationId, history, chatModelId, systemPurposeId, conversation?.questions ?? [], conversation?.currentQuestionIndex ?? 0, ``);
  };


  const handleDownloadConversationToJson = (conversationId: string) => {
    const conversation = _findConversation(conversationId);
    conversation && downloadConversationJson(conversation);
  };


  const handlePublishConversation = (conversationId: string) => setPublishConversationId(conversationId);

  const handleConfirmedPublishConversation = async () => {
    if (publishConversationId) {
      const conversation = _findConversation(publishConversationId);
      setPublishConversationId(null);
      conversation && setPublishResponse(await publishConversation('paste.gg', conversation, !useSettingsStore.getState().showSystemMessages));
    }
  };

  const handleCallGETMessageAPI = async (conversationId: string, language: string, history: DMessage[]) => {
    if (conversationId && chatModelId && systemPurposeId) {
      const a = SystemPurposes[systemPurposeId as SystemPurposeId]
      await getAllQuestionsFromAI(conversationId, history, chatModelId, a?.systemMessage ?? '');
    }
  };

  return (

    <Box
      sx={{
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
        ...(props.sx || {}),
      }}>

      <ApplicationBar
        conversationId={activeConversationId}
        onDownloadConversationJSON={handleDownloadConversationToJson}
        onPublishConversation={handlePublishConversation}
        onShowSettings={props.onShowSettings}
        sx={{
          position: 'sticky', top: 0, zIndex: 20,
          // ...(process.env.NODE_ENV === 'development' ? { background: theme.vars.palette.danger.solidBg } : {}),
        }} />

      <ChatMessageList
        conversationId={activeConversationId}
        onRestartConversation={handleRestartConversation}
        sx={{
          flexGrow: 1,
          background: theme.vars.palette.background.level2,
          overflowY: 'hidden',
          marginBottom: '-1px',
        }} 
        callGETMessagesAPI={handleCallGETMessageAPI}
        />

      <Composer
        conversationId={activeConversationId} messageId={null}
        isDeveloperMode={systemPurposeId === 'Developer'}
        onSendMessage={handleSendMessage}
        sx={{
          position: 'sticky', bottom: 0, zIndex: 21,
          background: theme.vars.palette.background.surface,
          borderTop: `1px solid ${theme.vars.palette.divider}`,
          p: { xs: 1, md: 2 },
        }} />

      {/* Confirmation for Publishing */}
      <ConfirmationModal
        open={!!publishConversationId} onClose={() => setPublishConversationId(null)} onPositive={handleConfirmedPublishConversation}
        confirmationText={<>
          Share your conversation anonymously on <Link href='https://paste.gg' target='_blank'>paste.gg</Link>?
          It will be unlisted and available to share and read for 30 days. Keep in mind, deletion may not be possible.
          Are you sure you want to proceed?
        </>} positiveActionText={'Understood, upload to paste.gg'}
      />

      {/* Show the Published details */}
      {!!publishResponse && (
        <PublishedModal open onClose={() => setPublishResponse(null)} response={publishResponse} />
      )}

    </Box>

  );
}
