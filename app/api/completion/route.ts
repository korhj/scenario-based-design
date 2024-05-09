import {
  ChatCompletionRequestMessage,
  Configuration,
  OpenAIApi,
} from "openai-edge";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { CompletionRequestBody } from "@/lib/types";

// Create an OpenAI API client
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

export const runtime = "edge";

// This is the instructions that GPT-4 will use to know how to respond. For more information on
// the difference between a system message and a user message, see:
// https://platform.openai.com/docs/guides/gpt/chat-completions-api

const systemMessage = {
  role: "assistant",
  content: `
  "You have two tasks. Use the dimensions created in task 1 to complete task 2. \n"


  "Task 1 \n"

  "I am a Web UI designer, and you are an intelligent assistant that helps me analyze user scenarios and generate design spaces. Now I am developing a low-fidelity prototype of Web UI. \n"

  "User Scenario: In UI design, a user scenario is a description of the user's interaction with the interface in a specific context. It covers the user's needs, motivations,
   behaviours and the interaction process with the interface. Through user scenarios, the design team can better understand user needs, guide the interface design, 
   and ensure that the design can meet the actual use and expectations of users. \n"

  "UI Low Fidelity Prototyping : UI Low Fidelity Prototyping is a preliminary design sketch used to present the overall structure and layout of the user interface. \n"
  "The following are the basic characteristics of a low-fidelity prototype: \n"
  "Visual: Presenting only some of the product's visual attributes, such as the layout of UI element positions. \n"
  "Content: presents only the key elements of the product's content. \n"
  "Interaction: presents only the page relationships involved in the important functions of the product. \n"


  "Now I am giving you a user scenario and you need to based on that user scenario you help me to explore the design space of UI elements in Web UI low fidelity prototyping design. \n"
  "The first step is to analyse the 'scene' by means of scene mapping, in the scene mapping step you need to decompose the 'scene' into multiple parts, i.e. the long scene is decomposed 
  into multiple successive smaller scenes. \n"

  "After dividing the scene into parts, each part was conceptualised separately. \n"
  "Conceptualise each section from 3 different perspectives of the creative category: \n"
  "1. Design ideas. For example, it might be helpful to let Debbie filter the reviews based on common keywords. \n"
  "2. Questions that arise at this step that you'll want to resolve. For example, you might wonder if the hotel metadata taxonomy can support filtering by price and user-rating. \n"
  "3. Comments or considerations that may be relevant. For example, there might be variable information available in the database for amenities available at each hotel. 
      Participants may want to call out this concern and capture it on the map to make sure related data structures are considered, as well as how these might impact solutions. \n"

  "The above is the content of your idea, this part serves as your REASON and will be used later. You don't have to export it now, but you have to think about this content 
  and think deeply about it before you proceed to the following steps. \n"



  "After analyzing the 'scenario', you need to follow the 'method': generate 5 design dimensions. For each dimension, you need 30 options for that dimension. \n"
  "'scenarios' has the user's scenario:\n"

  "\n"
  "In 'dimensons' there is the following structure: \n"

  "1.\"UI pages\" refers to what UI page themes (e.g. landing pages) may be available. \n"
  "2. \"Element name\" means what the name of this UI element is (e.g. login key). \n"
  "3. \"Element forms\" refers to the different UI element forms (e.g. button or text box). \n"
  "4. \"Element content\" refers to what the UI element contains (e.g. a menu or a form). \n"

  "You will be given user scenarios as an input. \n"

  "'dimensions' is the design space:\n"
  "This is your 'dimensions': \n"

  {   
    "UI pages": {

        "Options": [null]
    },

    "Element name": {

        "Options": [null]
    },
    "Element forms": {

        "Options": [null]
    },
    "Element content": {

        "Options": [null]
    }

  "This is the 'methods' that guide you how to update the content in 'dimensions': \n"

  "1.\"UI pages\" Add the 30 options that belong to this dimension here. \n"
  "2. \"Element name\" Add the 30 options belonging to this dimension here. \n"
  "3. \"Element forms\" Add the 30 options belonging to this dimension here. \n"
  "4. \"Element content\" Add the 30 options belonging to this dimension here. \n"

  "\n"


  ##### Combination Generating #####


  "After analysing the 'scenario' and 'design space' through scenario mapping, you need to follow the 'methodology': based on the description of the user scenario, 
  select from the UI elements in the design space the UI elements that you think are 10 most suitable UI elements as the UI elements in the low-fidelity prototype diagram in this design. 
  For each UI element, select one option from each dimension as an attribute of that UI element. From there, generate a design combination."



  "In 'combinations' there is the following structure: \n"


  "1. \"Page\" is a one-dimensional list. Refers to every possible page in this UI. \n"
  "2. \"EleName\" is a two-dimensional list. Refers to what the name of each UI element of the corresponding page is (e.g. login). \n"
  "3. \"EleForm\" is a two-dimensional list. Refers to what the form of each UI element of the corresponding page is (e.g. button or text box). \n"
  "4. \"EleCon\" is a two-dimensional list. Refers to the content contained in each UI element of the corresponding page (e.g. menu or form). \n"
  "5. \"Reason\" is a two-dimensional list. Refers to the reason why the combination of UI elements of the corresponding page is so designed (scenario mapping analysis of user scenarios). \n"


  "This is your 'combinations':\n"
  {  
    "Page": [null],
    "EleName": [[null]],
    "EleForm": [[null]],
    "EleCon": [[null]],
    "Reason": [[null]]
  }


  "\n"
  "'scenarios' are user scenarios:\n"
  "\n"
  "'dimensions' is the design space:\n"
  "\n"
  "'combinations' is the design combination:\n"


  "This is the 'methods' that guide you how to update the content in 'combinations': \n"

  "The first element of the 2D list corresponds to the first element of the 1D list \"Page\", and so on. 
  You need to add list elements to the 2D list to correspond to the number of elements in \"Page\". \n"
  "Combine the requirements analysis of the user scenario and the exploration of the design space 
  by filling in Reason with which short scene from the user scenario you analysed the results from. Update as follows:\n"

  "Update as follows: \n"

  "1. \"Page\" Add the name of the page theme (e.g. landing page, etc.) from 'dimensions'. \n"
  "2. \"EleName\" Add the name of the UI element on the corresponding page from 'dimensions', corresponding to the list above (e.g. [login,email],). \n"
  "3. \"EleForm\" Add the form of the UI element on the corresponding page from 'dimensions', corresponding to the list of \"EleName\" (e.g. [button, link],). \n"
  "4. \"EleCon\" Adds the content of the UI element on the corresponding page from 'dimensions', corresponding to the list above (e.g. menu or table). \n"
  "5. \"Reason\" Attach which short scene from the user scenario you analysed and add the reason for the design, corresponding to the list above. \n"


  "\n"


  ##########
  "You must return JSON of updated 'combinations'. \n"
  "You must show the entire JSON.\n"
  "You must use double quotes (\") for correct JSON format.\n"
  "You must not change the names of the default memory fields. Only update the value.\n"

  "\n"

  `
} as const;


// This is used to format the message that the user sends to the API. Note we should
// never have the client create the prompt directly as this could mean that the client
// could use your api for any general purpose completion and leak the "secret sauce" of
// your prompt.
async function buildUserMessage(
  req: Request,
): Promise<ChatCompletionRequestMessage> {
  const body = await req.json();

  // We use zod to validate the request body. To change the data that is sent to the API,
  // change the CompletionRequestBody type in lib/types.ts
  const { layers } = CompletionRequestBody.parse(body);

  const bulletedList = layers.map((layer) => `* ${layer}`).join("\n");

  return {
    role: "user",
    content: bulletedList,
  };
}

export async function POST(req: Request) {
  // Ask OpenAI for a streaming completion given the prompt
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    stream: true,
    temperature: 0,
    messages: [systemMessage, await buildUserMessage(req)],
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);
  // Respond with the stream
  const result = new StreamingTextResponse(stream);

  return result;
}
