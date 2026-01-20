import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, fileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing file: ${fileName}`);

    const systemPrompt = `You are a data extraction and table normalization engine. 
Your task is to read rows from an uploaded Excel/CSV containing invoice item data. 
Different sheets may have different column names, spellings, or formats.

You MUST extract the following fields from each row:

1. styleNo (required) → Can be labeled as:
   "Style No", "Style", "Style#", "Style Code", "Style ID", "style_no", "styleno", etc.

2. description (optional) → Can be labeled as:
   "Description", "Item Description", "Details", "Item", "Product Description", etc.
   If missing, return an empty string.

3. quantity (optional) → Can be labeled as:
   "Packing Quantity", "Packing Qty", "Qty", "Quantity", "Pack Qty", "Units", "Count", "Pcs", etc.
   Convert to a number. If missing or invalid, return 1.

4. unitPrice (required) → Can be labeled as:
   "Unit Price", "Price", "Rate", "Cost", "Unit Cost", etc.
   Convert to a number (remove commas, currency symbols, and text).
   If the value is not a valid number, skip the row.

OUTPUT FORMAT:
Return ONLY a valid JSON array of objects formatted exactly like this:

[
  {
    "styleNo": "STRING",
    "description": "STRING (may be empty)",
    "quantity": NUMBER,
    "unitPrice": NUMBER
  }
]

RULES:
- Do NOT invent or guess values.
- Do NOT modify Style No.
- Skip rows where required values are missing or invalid.
- No explanation, no notes — return only JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Parse this file content and extract invoice items:\n\n${fileContent}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "Failed to parse file content" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("AI Response:", content);

    // Extract JSON from the response (in case there's markdown formatting)
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/```\n?/g, "");
    }

    const parsedItems = JSON.parse(jsonContent);
    
    console.log(`Successfully parsed ${parsedItems.length} items`);

    return new Response(JSON.stringify({ items: parsedItems }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in parse-inventory-file function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
