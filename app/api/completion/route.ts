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
  role: "system",
  content: `
  
  This tool automates the creation of low-fidelity web UI prototypes by analyzing user scenarios and producing a JSON structure that outlines each web page and its corresponding UI elements. 
  Each element in the JSON is linked directly to user inputs, ensuring that the design is grounded in actual user needs.
  You are given one or more user scenarios describing the same website. You will output a JSON that always has the same structure. 

  In UI design, a user scenario is a description of the user's interaction with the interface in a specific context. It covers the user's needs, motivations, 
  behaviors and the interaction process with the interface. Through user scenarios, the design team can better understand user needs, guide the interface design, 
  and ensure that the design can meet the actual use and expectations of users.
    
  The output JSON must have following structure:

  {
    "page": [
      {
        "pageName": "page name here",
        "elements": [
          {
            "elementName": "element name here",
            "elementType": "element type here",
            "elementReason": "reason for the element here",
            "elementColor": "element color here",
          }
        ],
        "pageReason": "reason for the page here",
        "pageColor": "page color here"
      }
    ]
  }
  
  Page Object: Contains all relevant information for a single page.
  pageName: The title or identifier of the page.
  Elements: An array of UI elements on the page.
  elementName: The label or identifier for the UI element.
  elementType: The form the UI element takes (e.g., button, text field).
  elementReason: A direct quote from the user scenarios that justifies the inclusion of the element.
  pageReason: A direct quote from the user scenarios that justifies the inclusion of the page in the website.
  elementColor: An unique HEX color.
  pageColor: An unique HEX color. 

  here is an example for you

  user scenario:

  "Mary, a 30-year-old professional woman, works five days a week and is usually busy on weekdays. But on weekends, she likes to relax at home and take care of some of her daily tasks, 
  such as shopping. This Saturday morning, she decides to update her closet, so she opens the website of an online fashion store she frequently visits. She easily logs into her account, 
  with her personal information and payment methods already saved, eliminating the need for tedious steps. On the store's homepage, Mary sees the latest promotions and recommended items, 
  and then decides to browse through the new arrivals of shirts and dresses. Using the site's search function, she entered the styles and colors she was interested in and used filters to 
  narrow down the results. After browsing through a few options, she fell in love with a floral print shirt and went through the item page to check out the details, including size, material, 
  price and delivery options. After confirming that there are no problems, Mary adds the item to her cart and continues to browse other items until she is satisfied. She reviews the shopping 
  cart, confirms the item and quantity, and selects checkout and enters the delivery address. After confirming the order information, Mary selects the payment method and completes the payment. 
  She soon receives an order confirmation email telling her that the order has been successfully completed and is expected to be delivered within 3-5 business days. Mary is satisfied and closes 
  her browser. She looks forward to receiving her new dress and is ready to enjoy a relaxing weekend."

  output:

  {
    "page": [
      {
        "pageName": "Login Page",
        "elements": [
        ],
        "pageReason": "She easily logs into her account",
        "pageColor": "#8A2BE2"
      },
      {
        "pageName": "Homepage",
        "elements": [
          {
            "elementName": "Search Bar",
            "elementType": "Text Box",
            "elementReason": "Using the site's search function",
            "elementColor": "#9ACD32"
          },
          {
            "elementName": "Promotions Section",
            "elementType": "Image Gallery",
            "elementReason": "Mary sees the latest promotions",
            "elementColor": "#40E0D0"
          },
          {
            "elementName": "Recommendations Section",
            "elementType": "Dynamic List",
            "elementReason": "and recommended items",
            "elementColor": "#6495ED"
          }
        ],
        "pageReason": "On the store's homepage, Mary sees the latest promotions and recommended items",
        "pageColor": "#FF6347"
      },
      {
        "pageName": "Product List",
        "elements": [
          {
            "elementName": "Filter Options",
            "elementType": "Dropdown Menu",
            "elementReason": "used filters to narrow down the results",
            "elementColor": "#DC143C"
          },
          {
            "elementName": "Product Gallery",
            "elementType": "Image Gallery",
            "elementReason": "she fell in love with a floral print shirt and went through the item page",
            "elementColor": "#00CED1"
          }
        ],
        "pageReason": "decides to browse through the new arrivals of shirts and dresses",
        "pageColor": "#FFD700"
      },
      {
        "pageName": "Item Page",
        "elements": [
          {
            "elementName": "Item Details",
            "elementType": "List",
            "elementReason": "went through the item page to check out the details, including size, material, 
            price and delivery options",
            "elementColor": "#FF8C00"
          },
          {
            "elementName": "Add To Cart Button",
            "elementType": "Button",
            "elementReason": "Mary adds the item to her cart and continues to browse other items until she is satisfied.",
            "elementColor": "#6A5ACD"
          }
        ],
        "pageReason": "She reviews the shopping cart, confirms the item and quantity",
        "pageColor": "#20B2AA"
      },
      {
        "pageName": "Shopping Cart",
        "elements": [
          {
            "elementName": "Item Review Section",
            "elementType": "List",
            "elementReason": "reviews the shopping cart",
            "elementColor": "#FF69B4"
          },
          {
            "elementName": "Checkout Button",
            "elementType": "Button",
            "elementReason": "selects checkout and enters the delivery address",
            "elementColor": "#00FF7F"
          }
        ],
        "pageReason": "She reviews the shopping cart, confirms the item and quantity",
        "pageColor": "#FF4500"
      }
      
    ]
  }   
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
