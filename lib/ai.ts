import { ApiChatInput, ApiChatResponse, AnswersAPIModel } from '../pages/api/openai/chat';
import { DMessage, Questions, useChatStore } from '@/lib/store-chats';
import { fastChatModelId, ChatModelId, ChatModels } from '@/lib/data';
import { useSettingsStore } from '@/lib/store-settings';


/**
 * Main function to send the chat to the assistant and receive a response (streaming)
 */

export async function callGetQuestions( conversationId: string, 
  history: DMessage[], 
  language: string, 
  abort: AbortSignal, 
  assistantMessageId: string,
  editMessage: (conversationId: string, messageId: string, updatedMessage: Partial<DMessage>, touch: boolean) => void,
  setQuestions: (conversationId: string, questions: Questions[]) => void,
  setQuestionIndex: (conversationId: string, index: number) => void,
  experienceModel: ChatModelId,
  onFirstParagraph?: (firstParagraph: string) => void,
  ){
  try {
    const years = ChatModels[experienceModel]?.yearsExperience;
    const { apiHost } = useSettingsStore.getState();
    const host = apiHost == '' ? 'https://ankitkf.ngrok.io' : apiHost
    const url = host + `/interview-questions?yoe=${years}&pl=${language}`;
    const response = await fetch(url, {
      signal: abort,
    });

    if (response.ok) {
      //const reader = response.body.getReader();
      //const decoder = new TextDecoder('utf-8');
      const data = await response.json();
      const jsonQuestions = data.questions;
      console.log(data);
      console.log(assistantMessageId);
      const mappedQuestions = jsonQuestions.map(( jsonQuestion: Questions ) => ({
        question: jsonQuestion.question,
      }));
      //console.log(mappedQuestions);
      editMessage(conversationId, assistantMessageId, { text: jsonQuestions[0].question }, false);
      setQuestions(conversationId, mappedQuestions);
      setQuestionIndex(conversationId, 0);
      if (onFirstParagraph){
        onFirstParagraph(jsonQuestions[0].question);
      }
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      // expected, the user clicked the "stop" button
    } else {
      // TODO: show an error to the UI
      console.error('Fetch request error:', error);
    }
  }

   // finally, stop the typing animation
   editMessage(conversationId, assistantMessageId, { typing: false }, false);
}

export async function callGetAnswers( conversationId: string,
  abort: AbortSignal, 
  assistantMessageId: string,
  editMessage: (conversationId: string, messageId: string, updatedMessage: Partial<DMessage>, touch: boolean) => void,
  answer: string,
  question: string
  ){

//AnswersAPIModel
const payload: AnswersAPIModel = {
  question: question,
  candidate_answer: answer
};

  try {
    const { apiHost } = useSettingsStore.getState();
    const host = apiHost == '' ? 'https://ankitkf.ngrok.io' : apiHost
    const url = host + `/grade-answers`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abort,
    });

    if (response.ok) {
      const data = await response.json();
      const score = data.score;
      const answerDescription = data.score_description;
    
      editMessage(conversationId, assistantMessageId, { text: `${answerDescription} Your score for this answer is ${score}` }, false);
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      // expected, the user clicked the "stop" button
    } else {
      // TODO: show an error to the UI
      console.error('Fetch request error:', error);
      editMessage(conversationId, assistantMessageId, { text: `Error (Verbose): getAnswers api failed.` }, false);
    }
  }

   // finally, stop the typing animation
   editMessage(conversationId, assistantMessageId, { typing: false }, false);
}

export async function streamAssistantMessage(
  conversationId: string, assistantMessageId: string, history: DMessage[],
  apiKey: string | undefined, apiHost: string | undefined, apiOrganizationId: string | undefined,
  chatModelId: string, modelTemperature: number, modelMaxResponseTokens: number,
  editMessage: (conversationId: string, messageId: string, updatedMessage: Partial<DMessage>, touch: boolean) => void,
  abortSignal: AbortSignal,
  onFirstParagraph?: (firstParagraph: string) => void,
) {

  const payload: ApiChatInput = {
    api: {
      ...(apiKey && { apiKey }),
      ...(apiHost && { apiHost }),
      ...(apiOrganizationId && { apiOrganizationId }),
    },
    model: chatModelId,
    messages: history.map(({ role, text }) => ({
      role: role,
      content: text,
    })),
    temperature: modelTemperature,
    max_tokens: modelMaxResponseTokens,
  };

  try {

    const response = await fetch('/api/openai/stream-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortSignal,
    });

    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      // loop forever until the read is done, or the abort controller is triggered
      let incrementalText = '';
      let parsedFirstPacket = false;
      let sentFirstParagraph = false;
      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        incrementalText += decoder.decode(value, { stream: true });

        // there may be a JSON object at the beginning of the message, which contains the model name (streaming workaround)
        if (!parsedFirstPacket && incrementalText.startsWith('{')) {
          const endOfJson = incrementalText.indexOf('}');
          if (endOfJson > 0) {
            const json = incrementalText.substring(0, endOfJson + 1);
            incrementalText = incrementalText.substring(endOfJson + 1);
            try {
              const parsed = JSON.parse(json);
              editMessage(conversationId, assistantMessageId, { originLLM: parsed.model }, false);
              parsedFirstPacket = true;
            } catch (e) {
              // error parsing JSON, ignore
              console.log('Error parsing JSON: ' + e);
            }
          }
        }

        // if the first paragraph (after the first packet) is complete, call the callback
        if (parsedFirstPacket && onFirstParagraph && !sentFirstParagraph) {
          let cutPoint = incrementalText.lastIndexOf('\n');
          if (cutPoint < 0)
            cutPoint = incrementalText.lastIndexOf('. ');
          if (cutPoint > 100 && cutPoint < 400) {
            const firstParagraph = incrementalText.substring(0, cutPoint);
            onFirstParagraph(firstParagraph);
            sentFirstParagraph = true;
          }
        }

        editMessage(conversationId, assistantMessageId, { text: incrementalText }, false);
      }
    }

  } catch (error: any) {
    if (error?.name === 'AbortError') {
      // expected, the user clicked the "stop" button
    } else {
      // TODO: show an error to the UI
      console.error('Fetch request error:', error);
    }
  }

  // finally, stop the typing animation
  editMessage(conversationId, assistantMessageId, { typing: false }, false);
}


/**
 * Creates the AI titles for conversations, by taking the last 5 first-lines and asking AI what's that about
 */
export async function updateAutoConversationTitle(conversationId: string) {

  // external state
  const { conversations, setAutoTitle } = useChatStore.getState();

  // only operate on valid conversations, without any title
  const conversation = conversations.find(c => c.id === conversationId) ?? null;
  if (!conversation || conversation.autoTitle || conversation.userTitle) return;

  // first line of the last 5 messages
  const historyLines: string[] = conversation.messages.slice(-5).filter(m => m.role !== 'system').map(m => {
    let text = m.text.split('\n')[0];
    text = text.length > 50 ? text.substring(0, 50) + '...' : text;
    text = `${m.role === 'user' ? 'You' : 'Assistant'}: ${text}`;
    return `- ${text}`;
  });

  // prepare the payload
  const { apiKey, apiHost, apiOrganizationId } = useSettingsStore.getState();
  const payload: ApiChatInput = {
    api: {
      ...(apiKey && { apiKey }),
      ...(apiHost && { apiHost }),
      ...(apiOrganizationId && { apiOrganizationId }),
    },
    model: fastChatModelId,
    messages: [
      { role: 'system', content: `You are an AI language expert who specializes in creating very concise and short chat titles.` },
      {
        role: 'user', content:
          'Analyze the given list of pre-processed first lines from each participant\'s conversation and generate a concise chat ' +
          'title that represents the content and tone of the conversation. Only respond with the lowercase short title and nothing else.\n' +
          '\n' +
          historyLines.join('\n') +
          '\n',
      },
    ],
  };

  try {
    const response = await fetch('/api/openai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      const chatResponse: ApiChatResponse = await response.json();
      const title = chatResponse.message?.content?.trim()
        ?.replaceAll('"', '')
        ?.replace('Title: ', '')
        ?.replace('title: ', '');
      if (title)
        setAutoTitle(conversationId, title);
    }
  } catch (error: any) {
    console.error('updateAutoConversationTitle: fetch request error:', error);
  }
}
