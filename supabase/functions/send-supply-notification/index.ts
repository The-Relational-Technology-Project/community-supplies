import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// HTML escape function to prevent XSS in email templates
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Input validation schema
const SupplyNotificationSchema = z.object({
  itemName: z.string()
    .trim()
    .min(1, "Item name is required")
    .max(200, "Item name must be less than 200 characters"),
  category: z.string()
    .trim()
    .min(1, "Category is required")
    .max(100, "Category must be less than 100 characters"),
  ownerName: z.string()
    .trim()
    .min(1, "Owner name is required")
    .max(100, "Owner name must be less than 100 characters"),
  ownerEmail: z.string()
    .trim()
    .email("Invalid owner email address")
    .max(255, "Owner email must be less than 255 characters"),
  description: z.string()
    .trim()
    .min(1, "Description is required")
    .max(2000, "Description must be less than 2000 characters"),
  neighborhood: z.string()
    .trim()
    .max(200, "Neighborhood must be less than 200 characters")
    .optional(),
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    
    // Validate input
    const validationResult = SupplyNotificationSchema.safeParse(rawBody);
    
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

    const { itemName, category, ownerName, ownerEmail, description, neighborhood } = validationResult.data;

    console.log("Sending supply notification email for:", itemName);

    // Escape all user input for safe HTML rendering
    const safeItemName = escapeHtml(itemName);
    const safeCategory = escapeHtml(category);
    const safeOwnerName = escapeHtml(ownerName);
    const safeOwnerEmail = escapeHtml(ownerEmail);
    const safeDescription = escapeHtml(description);
    const safeNeighborhood = neighborhood ? escapeHtml(neighborhood) : null;

    const emailResponse = await resend.emails.send({
      from: "Community Supplies <notifications@communitysupplies.org>",
      to: ["josh@relationaltechproject.org"],
      subject: `New Supply Added: ${safeItemName}`,
      html: `
        <h2>New Supply Item</h2>
        <p><strong>Item:</strong> ${safeItemName}</p>
        <p><strong>Category:</strong> ${safeCategory}</p>
        <p><strong>Description:</strong> ${safeDescription}</p>
        ${safeNeighborhood ? `<p><strong>Neighborhood:</strong> ${safeNeighborhood}</p>` : ''}
        <hr>
        <p><strong>Owner:</strong> ${safeOwnerName}</p>
        <p><strong>Email:</strong> ${safeOwnerEmail}</p>
        <p>View the <a href="https://communitysupplies.org">catalog</a> to see all supplies.</p>
      `,
    });

    console.log("Supply notification email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-supply-notification function:", error);
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
