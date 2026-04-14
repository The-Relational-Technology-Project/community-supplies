import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Define validation schema
const ContactRequestSchema = z.object({
  senderName: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  senderContact: z.string()
    .trim()
    .min(1, "Contact information is required")
    .max(255, "Contact information must be less than 255 characters")
    .refine(
      (val) => {
        // Check if it's either a valid email or a phone number
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
        return emailRegex.test(val) || phoneRegex.test(val);
      },
      "Must be a valid email address or phone number"
    ),
  message: z.string()
    .trim()
    .min(1, "Message is required")
    .max(2000, "Message must be less than 2000 characters"),
  supplyId: z.string().uuid("Invalid supply ID"),
  supplyName: z.string().trim().min(1).max(200),
  supplyOwnerId: z.string().uuid("Invalid owner ID"),
  supplyOwnerEmail: z.string().email("Invalid owner email"),
  communityId: z.string().uuid("Invalid community ID").optional(),
});

type ContactRequest = z.infer<typeof ContactRequestSchema>;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    
    // Validate input data
    const validationResult = ContactRequestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input data",
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    const requestData: ContactRequest = validationResult.data;
    
    console.log("Validated contact request for supply:", requestData.supplyName);

    // Store the supply request in the database
    const { data: supplyRequest, error: dbError } = await supabase
      .from('supply_requests')
      .insert({
        supply_id: requestData.supplyId,
        supply_name: requestData.supplyName,
        supply_owner_id: requestData.supplyOwnerId,
        sender_name: requestData.senderName,
        sender_contact: requestData.senderContact,
        message: requestData.message,
        status: 'pending',
        ...(requestData.communityId ? { community_id: requestData.communityId } : {}),
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to save supply request: ${dbError.message}`);
    }

    console.log("Supply request saved:", supplyRequest);

    // Check if sender contact is an email for reply-to and confirmation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailContact = emailRegex.test(requestData.senderContact);
    
    // Send email notification to supply owner
    const emailResponse = await resend.emails.send({
      from: "Community Supplies <notifications@communitysupplies.org>",
      to: [requestData.supplyOwnerEmail],
      reply_to: isEmailContact ? requestData.senderContact : undefined,
      subject: `Someone wants to borrow: ${requestData.supplyName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #4a3728;">
          <h2 style="color: #c17c4a; margin-bottom: 24px;">Someone is interested in borrowing your item!</h2>
          
          <div style="background: #f5ebe1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c17c4a;">
            <h3 style="margin-top: 0; color: #4a3728; font-size: 18px;">Item: ${requestData.supplyName}</h3>
          </div>

          <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5d4c1;">
            <h4 style="margin-top: 0; color: #4a3728; font-size: 16px;">Message from ${requestData.senderName}:</h4>
            <p style="line-height: 1.6; color: #6b5a4a; margin: 12px 0;">${requestData.message.replace(/\n/g, '<br>')}</p>
          </div>

          <div style="background: #fff9f5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5d4c1;">
            <h4 style="margin-top: 0; color: #4a3728; font-size: 16px;">Contact Information:</h4>
            <p style="margin: 8px 0; color: #6b5a4a;"><strong>Name:</strong> ${requestData.senderName}</p>
            <p style="margin: 8px 0; color: #6b5a4a;"><strong>Contact:</strong> ${requestData.senderContact}</p>
            ${isEmailContact ? '<p style="margin: 12px 0 0 0; color: #8b7355; font-size: 14px;"><em>You can reply directly to this email to respond.</em></p>' : ''}
          </div>

          <hr style="border: none; border-top: 1px solid #e5d4c1; margin: 30px 0;">
          
          <p style="color: #8b7355; font-size: 14px; line-height: 1.5;">
            This message was sent through Community Supplies, a neighborhood sharing platform. 
            ${isEmailContact ? 'Reply directly to this email' : 'Please reach out using the contact information above'} to coordinate sharing your item.
          </p>
        </div>
      `,
    });

    console.log("Owner notification email sent successfully:", emailResponse);

    // Send confirmation email to requester if they provided an email
    if (isEmailContact) {
      const confirmationResponse = await resend.emails.send({
        from: "Community Supplies <notifications@communitysupplies.org>",
        to: [requestData.senderContact],
        subject: `Your request for "${requestData.supplyName}" has been sent`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #4a3728;">
            <h2 style="color: #c17c4a; margin-bottom: 24px;">Your request has been submitted!</h2>
            
            <p style="color: #6b5a4a; line-height: 1.6; margin: 16px 0;">
              Hi ${requestData.senderName},
            </p>
            
            <p style="color: #6b5a4a; line-height: 1.6; margin: 16px 0;">
              We've successfully sent your request to the owner of <strong>${requestData.supplyName}</strong>. They'll receive your message and contact information, and should reach out to you directly to coordinate.
            </p>

            <div style="background: #f5ebe1; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #c17c4a;">
              <h3 style="margin-top: 0; color: #4a3728; font-size: 16px;">Your Message:</h3>
              <p style="line-height: 1.6; color: #6b5a4a; margin: 8px 0;">${requestData.message.replace(/\n/g, '<br>')}</p>
            </div>

            <div style="background: #fff9f5; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e5d4c1;">
              <h4 style="margin-top: 0; color: #4a3728; font-size: 16px;">What happens next?</h4>
              <p style="color: #6b5a4a; line-height: 1.6; margin: 8px 0;">
                The item owner will contact you directly using the contact information you provided. Please keep an eye on your email and respond promptly when they reach out.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5d4c1; margin: 30px 0;">
            
            <p style="color: #8b7355; font-size: 14px; line-height: 1.5;">
              Thank you for using Community Supplies to share resources within your neighborhood!
            </p>
          </div>
        `,
      });

      console.log("Requester confirmation email sent successfully:", confirmationResponse);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailResponse,
      supplyRequest: supplyRequest
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-contact-message function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);