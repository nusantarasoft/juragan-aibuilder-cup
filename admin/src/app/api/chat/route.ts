import { NextResponse } from 'next/server';

// Mock AI endpoint since we don't have the OpenAI API key configured right now.
// In a real scenario, we would use the Vercel AI SDK here:
// import { streamText } from 'ai';
// import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        
        // Simple mock responder based on keywords
        const lastMessage = messages[messages.length - 1].content.toLowerCase();
        let reply = "I am your Facility Copilot. How can I assist you with the building operations today?";

        if (lastMessage.includes('pue') || lastMessage.includes('power')) {
            reply = "The current facility PUE is 1.35 and total power load is 2,450 kW. This is within optimal operating parameters, though Data Hall A UPS load is slightly high at 65%.";
        } else if (lastMessage.includes('alarm') || lastMessage.includes('fire')) {
            reply = "There are currently 4 active alarms. The most critical is a high temperature warning in Server Room 2. There are no active fire alarms.";
        } else if (lastMessage.includes('chiller') || lastMessage.includes('cooling')) {
            reply = "Chiller Plant capacity is currently at 82%. Both Chiller 1 and Chiller 2 are running. There are no reported faults.";
        } else if (lastMessage.includes('turn off') || lastMessage.includes('shutdown')) {
            reply = "I cannot execute control commands directly for safety reasons. Please use the BMS HVAC dashboard to manually turn off equipment.";
        }

        // Return a mock streamed response formatted for the AI SDK
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const words = reply.split(' ');
                for (let i = 0; i < words.length; i++) {
                    // Send word by word with a slight delay to simulate streaming
                    controller.enqueue(encoder.encode(`0:"${words[i]} "\n`));
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                controller.close();
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Vercel-AI-Data-Stream': 'v1'
            }
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
