// Supabase Edge Function: Send Email
// This function sends emails via SMTP and stores them in the database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
    from: string; // Email address of sender (must be user's account)
    to: string[]; // Array of recipient emails
    cc?: string[];
    bcc?: string[];
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get auth token from request
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize Supabase client with user's token
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request
        const emailRequest: SendEmailRequest = await req.json();

        // Verify user owns the sender email account
        const { data: account, error: accountError } = await supabase
            .from("email_accounts")
            .select("*")
            .eq("email_address", emailRequest.from)
            .eq("user_id", user.id)
            .single();

        if (accountError || !account) {
            return new Response(
                JSON.stringify({ error: "You don't have permission to send from this email address" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // SMTP Configuration
        const smtpHost = Deno.env.get("SMTP_HOST") || "mailserver";
        const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "25");
        const smtpUser = Deno.env.get("SMTP_USER") || emailRequest.from;
        const smtpPass = Deno.env.get("SMTP_PASS") || "";

        // Send email via SMTP
        const client = new SmtpClient();

        await client.connectTLS({
            hostname: smtpHost,
            port: smtpPort,
            username: smtpUser,
            password: smtpPass,
        });

        await client.send({
            from: emailRequest.from,
            to: emailRequest.to.join(", "),
            cc: emailRequest.cc?.join(", "),
            bcc: emailRequest.bcc?.join(", "),
            subject: emailRequest.subject,
            content: emailRequest.text || "",
            html: emailRequest.html,
        });

        await client.close();

        // Store sent email in database
        const serviceClient = createClient(
            supabaseUrl,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const toAddresses = emailRequest.to.map(email => ({ address: email }));
        const ccAddresses = emailRequest.cc?.map(email => ({ address: email })) || [];

        const { data: insertedEmail, error: insertError } = await serviceClient
            .from("emails")
            .insert({
                account_id: account.id,
                from_address: emailRequest.from,
                from_name: account.display_name,
                to_addresses: toAddresses,
                cc_addresses: ccAddresses,
                subject: emailRequest.subject,
                body_text: emailRequest.text,
                body_html: emailRequest.html,
                folder: "SENT",
                is_read: true,
                sent_at: new Date().toISOString(),
                received_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error storing sent email:", insertError);
        }

        return new Response(
            JSON.stringify({
                success: true,
                emailId: insertedEmail?.id,
                message: "Email sent successfully"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error sending email:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
