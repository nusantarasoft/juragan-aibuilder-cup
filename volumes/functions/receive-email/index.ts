// Supabase Edge Function: Receive Email Webhook
// This function receives incoming emails from mailserver and stores them in the database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncomingEmail {
    messageId?: string;
    from: { address: string; name?: string };
    to: { address: string; name?: string }[];
    cc?: { address: string; name?: string }[];
    subject?: string;
    text?: string;
    html?: string;
    date?: string;
    headers?: Record<string, string>;
    attachments?: {
        filename: string;
        contentType: string;
        size: number;
        content?: string; // Base64 encoded
    }[];
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Verify webhook secret
        const webhookSecret = Deno.env.get("EMAIL_WEBHOOK_SECRET");
        const authHeader = req.headers.get("x-webhook-secret");

        if (webhookSecret && authHeader !== webhookSecret) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse incoming email
        const email: IncomingEmail = await req.json();

        // Initialize Supabase client with service role
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Find the email account for the recipient
        const recipientAddress = email.to[0]?.address;
        const { data: account } = await supabase
            .from("email_accounts")
            .select("id")
            .eq("email_address", recipientAddress)
            .single();

        // Insert email into database
        const { data: insertedEmail, error: emailError } = await supabase
            .from("emails")
            .insert({
                message_id: email.messageId,
                account_id: account?.id || null,
                from_address: email.from.address,
                from_name: email.from.name,
                to_addresses: email.to,
                cc_addresses: email.cc || [],
                subject: email.subject,
                body_text: email.text,
                body_html: email.html,
                folder: "INBOX",
                is_read: false,
                received_at: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
                raw_headers: email.headers,
                has_attachments: (email.attachments?.length || 0) > 0,
                size_bytes: (email.text?.length || 0) + (email.html?.length || 0),
            })
            .select()
            .single();

        if (emailError) {
            throw emailError;
        }

        // Handle attachments
        if (email.attachments && email.attachments.length > 0 && insertedEmail) {
            for (const attachment of email.attachments) {
                // Store attachment in Supabase Storage
                let storagePath = null;

                if (attachment.content) {
                    const filePath = `attachments/${insertedEmail.id}/${attachment.filename}`;
                    const fileData = Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0));

                    const { error: uploadError } = await supabase.storage
                        .from("email-attachments")
                        .upload(filePath, fileData, {
                            contentType: attachment.contentType,
                        });

                    if (!uploadError) {
                        storagePath = filePath;
                    }
                }

                // Insert attachment metadata
                await supabase
                    .from("email_attachments")
                    .insert({
                        email_id: insertedEmail.id,
                        filename: attachment.filename,
                        content_type: attachment.contentType,
                        size_bytes: attachment.size,
                        storage_path: storagePath,
                    });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                emailId: insertedEmail?.id,
                message: "Email received and stored"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error processing email:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
