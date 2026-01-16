import { supabase } from "@/integrations/supabase/client";
import { getOpenAIApiKey } from "./openai-config";

export interface AutomationExecutionResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Execute an email automation
 */
export async function executeEmailAutomation(
  automation: any,
  clientEmail?: string
): Promise<AutomationExecutionResult> {
  try {
    const config = automation.config || {};
    const emailMessage = config.email_message || "";
    const emailSendDate = config.email_send_date || "";
    const emailSubject = config.email_subject || automation.name || "Email from ClientFlowAI";
    const clientId = config.client_id;

    if (!emailMessage) {
      throw new Error("Email message is required");
    }

    // Get client email from client_id if provided, otherwise use the passed clientEmail
    let recipientEmail = clientEmail;
    if (!recipientEmail && clientId) {
      const { data: client, error: clientError } = await ((supabase as any)
        .from("clients")
        .select("email, client_id")
        .eq("client_id", clientId)
        .single());

      if (clientError || !client) {
        throw new Error(`Client not found: ${clientError?.message || "Unknown error"}`);
      }

      recipientEmail = client.email;
    }

    if (!recipientEmail) {
      throw new Error("Client email is required. Please select a client or provide an email address.");
    }

    // Check if it's time to send the email
    if (emailSendDate) {
      const sendDate = new Date(emailSendDate);
      const now = new Date();
      const timeDiff = sendDate.getTime() - now.getTime();
      const minutesUntilSend = timeDiff / (1000 * 60);
      
      // If the send date is more than 1 minute in the future, we should schedule it
      // But if user clicks "Run Now", we'll send it immediately anyway
      // The scheduled check function will handle automatic sending
      if (minutesUntilSend > 1) {
        // For better UX: if user clicks "Run Now", send immediately regardless of schedule
        // But log that it was scheduled
        console.log(`Email was scheduled for ${sendDate.toLocaleString()}, but sending now per user request`);
        // Continue to send the email
      }
      // If date is in the past or very close (within 1 minute), send immediately
    }

    // Get current user session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("User not authenticated");
    }

    // Call Supabase Edge Function to send email
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: recipientEmail,
        subject: emailSubject,
        html: emailMessage.replace(/\n/g, "<br>"), // Convert newlines to HTML breaks
        text: emailMessage, // Plain text version
      },
    });

    if (error) {
      throw new Error(error.message || "Failed to send email");
    }

    if (!data || !data.success) {
      throw new Error(data?.error || "Failed to send email");
    }

    return {
      success: true,
      message: data.message || "Email sent successfully",
      data: {
        sent: true,
        to: recipientEmail,
        subject: emailSubject,
        emailId: data.data?.id,
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to send email",
    };
  }
}

/**
 * Execute a meeting follow-up automation
 */
export async function executeMeetingFollowUpAutomation(
  automation: any,
  clientEmail?: string
): Promise<AutomationExecutionResult> {
  try {
    const config = automation.config || {};
    const meetingName = config.meeting_name || "";
    const emailContent = config.email_content || "";
    const clientId = config.client_id;

    if (!meetingName || !emailContent) {
      throw new Error("Meeting name and email content are required");
    }

    // Get client email from client_id if provided, otherwise use the passed clientEmail
    let recipientEmail = clientEmail;
    if (!recipientEmail && clientId) {
      const { data: client, error: clientError } = await ((supabase as any)
        .from("clients")
        .select("email, client_id")
        .eq("client_id", clientId)
        .single());

      if (clientError || !client) {
        throw new Error(`Client not found: ${clientError?.message || "Unknown error"}`);
      }

      recipientEmail = client.email;
    }

    if (!recipientEmail) {
      throw new Error("Client email is required. Please select a client or provide an email address.");
    }

    // Get current user session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("User not authenticated");
    }

    // Prepare email content with meeting follow-up template
    const emailSubject = `Follow-up: ${meetingName}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Follow-up: ${meetingName}</h2>
        <div style="margin-top: 20px; line-height: 1.6;">
          ${emailContent.replace(/\n/g, "<br>")}
        </div>
      </div>
    `;

    // Call Supabase Edge Function to send email
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: recipientEmail,
        subject: emailSubject,
        html: htmlContent,
        text: emailContent,
      },
    });

    if (error) {
      throw new Error(error.message || "Failed to send meeting follow-up email");
    }

    if (!data || !data.success) {
      throw new Error(data?.error || "Failed to send meeting follow-up email");
    }

    return {
      success: true,
      message: data.message || `Meeting follow-up email sent for "${meetingName}"`,
      data: {
        sent: true,
        to: recipientEmail,
        meetingName,
        emailId: data.data?.id,
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to send meeting follow-up email",
    };
  }
}

/**
 * Execute an AI client summary automation
 */
export async function executeAIClientSummaryAutomation(
  automation: any
): Promise<AutomationExecutionResult> {
  try {
    const config = automation.config || {};
    const clientId = config.client_id;

    if (!clientId) {
      throw new Error("Client ID is required");
    }

    // Get client data
    // Try both client_id and id columns since the schema might vary
    let { data: client, error: clientError } = await ((supabase as any)
      .from("clients")
      .select("*")
      .eq("client_id", clientId)
      .single());

    // If not found with client_id, try with id
    if (clientError && clientError.code === "PGRST116") {
      const { data: clientById, error: errorById } = await ((supabase as any)
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single());
      
      if (!errorById && clientById) {
        client = clientById;
        clientError = null;
      }
    }

    if (clientError || !client) {
      console.error("Client lookup error:", clientError);
      console.error("Client ID searched:", clientId);
      throw new Error(`Client not found: ${clientError?.message || "Unknown error"}`);
    }
    
    console.log("Client found:", (client as any).name || (client as any).client_name);

    // Get the actual client_id from the found client (use once for all queries)
    const actualClientId = (client as any).client_id || (client as any).id || clientId;
    const clientData = client as any;
    const clientName = clientData.name || clientData.client_name || "Unknown";

    // Get client deals
    const { data: deals } = await (supabase
      .from("deals")
      .select("*")
      .eq("client_id", actualClientId) as any);

    // Get client interactions if available
    const { data: interactions } = await ((supabase as any)
      .from("interactions")
      .select("*")
      .eq("client_id", actualClientId)
      .order("ocurred_at", { ascending: false })
      .limit(10));

    // Get client prioritization data (most recent)
    const { data: prioritizationData } = await ((supabase as any)
      .from("client_prioritizations")
      .select("*")
      .eq("client_id", actualClientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single());

    // Build context for AI
    const currentPriority = clientData.priority || clientData.status || "medium";

    // Format deals information
    const dealsCount = deals?.length || 0;
    const totalDealValue = deals?.reduce((sum: number, deal: any) => sum + (parseFloat(deal.amount) || 0), 0) || 0;
    const dealsByStage = deals?.reduce((acc: Record<string, number>, deal: any) => {
      const stage = deal.stage || "Unknown";
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {}) || {};

    // Format prioritization data
    let prioritizationInfo = "No prioritization data available";
    if (prioritizationData) {
      const prioritization = prioritizationData;
      prioritizationInfo = `
Prioritization Analysis:
- Calculated Priority: ${prioritization.calculated_priority || "N/A"}
- Active Deals Count: ${Array.isArray(prioritization.active_deals) ? prioritization.active_deals.join(", ") : prioritization.active_deals || "N/A"}
- Interaction Frequency: ${Array.isArray(prioritization.interaction_frequency) ? prioritization.interaction_frequency.join(", ") : prioritization.interaction_frequency || "N/A"}
${prioritization.who_initiated ? `- Who Initiated Contact: ${Array.isArray(prioritization.who_initiated) ? prioritization.who_initiated.join(", ") : prioritization.who_initiated}` : ""}
${prioritization.pending_proposal ? `- Pending Proposal: ${Array.isArray(prioritization.pending_proposal) ? prioritization.pending_proposal.join(", ") : prioritization.pending_proposal}` : ""}
${prioritization.pdf_priority ? `- PDF Analysis Priority: ${prioritization.pdf_priority}` : ""}
${prioritization.pdf_sentiment ? `- PDF Sentiment: ${prioritization.pdf_sentiment}` : ""}
${prioritization.pdf_keywords_count ? `- PDF Keywords Count: ${prioritization.pdf_keywords_count}` : ""}
- Prioritization Date: ${prioritization.created_at ? new Date(prioritization.created_at).toLocaleDateString() : "N/A"}
`;
    }

    const clientContext = `
=== CLIENT PROFILE ===
Name: ${clientName}
Email: ${clientData.email || "N/A"}
Phone: ${clientData.phone || "N/A"}
Company: ${clientData.company || "N/A"}
Lead Source: ${clientData.lead_source || clientData.source || "N/A"}
Current Priority: ${currentPriority}
Created: ${clientData.created_at ? new Date(clientData.created_at).toLocaleDateString() : "N/A"}
Last Contact: ${clientData.last_contact ? new Date(clientData.last_contact).toLocaleDateString() : "N/A"}

=== DEALS ANALYSIS ===
Total Deals: ${dealsCount}
Total Deal Value: $${totalDealValue.toLocaleString()}
Deals by Stage:
${Object.entries(dealsByStage).map(([stage, count]) => `  - ${stage}: ${count} deal(s)`).join("\n") || "  No deals"}
${deals && deals.length > 0 ? "\nDeal Details:" : ""}
${deals?.map((deal: any, index: number) => 
  `  ${index + 1}. Stage: ${deal.stage || "N/A"} | Amount: $${(deal.amount || 0).toLocaleString()} | Created: ${deal.created_at ? new Date(deal.created_at).toLocaleDateString() : "N/A"}`
).join("\n") || ""}

=== PRIORITIZATION DATA ===
${prioritizationInfo}

=== RECENT INTERACTIONS ===
${interactions && interactions.length > 0 
  ? interactions.map((interaction: any, index: number) => 
      `  ${index + 1}. ${interaction.type || "Interaction"} via ${interaction.channel || "N/A"} on ${interaction.ocurred_at ? new Date(interaction.ocurred_at).toLocaleDateString() : "N/A"}`
    ).join("\n")
  : "No recent interactions recorded"
}
`;

    // Generate AI summary using OpenAI
    const openAIApiKey = getOpenAIApiKey();
    
    if (!openAIApiKey) {
      throw new Error("OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your environment variables.");
    }
    
    console.log("Generating AI summary for client:", clientData.name);
    console.log("Client context length:", clientContext.length);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert CRM analyst that generates comprehensive client summaries. Your role is to analyze all available client data including deals, prioritization metrics, interactions, and provide actionable recommendations for the sales team.

Your summaries should:
1. Analyze the client's current status and priority level
2. Evaluate their deal pipeline and potential value
3. Review prioritization metrics (interaction frequency, deal activity, etc.)
4. Identify patterns and opportunities
5. Provide specific, actionable recommendations for approaching this client
6. Suggest next steps based on the client's priority and engagement level

Be specific, data-driven, and focus on actionable insights that will help the sales team effectively engage with this client.`
          },
          {
            role: "user",
            content: `Analyze the following client data and generate a comprehensive summary with recommendations:

${clientContext}

Please provide a detailed analysis in the following structure:

**1. CLIENT OVERVIEW**
- Current status and priority assessment
- Key characteristics and engagement level

**2. DEALS ANALYSIS**
- Summary of active deals and pipeline value
- Stage distribution and deal health
- Revenue potential assessment

**3. PRIORITIZATION INSIGHTS**
- Analysis of interaction patterns
- Deal activity assessment
- Priority justification based on metrics

**4. ENGAGEMENT PATTERNS**
- Communication frequency and quality
- Recent interaction trends
- Relationship strength indicators

**5. RECOMMENDATIONS FOR FUTURE APPROACH**
- Specific next steps based on priority level
- Suggested communication strategy
- Optimal timing for follow-ups
- Key talking points or focus areas
- Risk factors or opportunities to address

**6. PRIORITY ACTION ITEMS**
- Top 3 immediate actions to take
- Timeline recommendations
- Expected outcomes

Make your recommendations specific, actionable, and tailored to this client's unique situation. Use the prioritization data to inform your suggestions.`
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API error:", error);
      throw new Error(error.error?.message || "Failed to generate AI summary");
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content || "No summary generated";
    
    console.log("AI Summary generated successfully, length:", summary.length);
    
    return {
      success: true,
      message: "AI client summary generated successfully",
      data: {
        clientId: actualClientId,
        clientName: clientName,
        summary,
        generatedAt: new Date().toISOString(),
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to generate AI summary",
    };
  }
}

/**
 * Main function to execute any automation
 */
export async function executeAutomation(
  automation: any,
  options?: { clientEmail?: string }
): Promise<AutomationExecutionResult> {
  if (!automation.is_enabled && !automation.is_active) {
    return {
      success: false,
      message: "Automation is disabled",
    };
  }

  // Record execution start
  // Use automation_id if available, otherwise fall back to id
  const automationIdForRun = automation.automation_id || automation.id;
  
  console.log("[executeAutomation] Creating run with automation_id:", automationIdForRun, {
    automation_automation_id: automation.automation_id,
    automation_id: automation.id,
  });
  
  // Insert without user_id - the trigger will set it automatically from auth.uid()
  // finished_at is NULL initially, will be set when the run completes
  const { data: run, error: runError } = await ((supabase as any)
    .from("automation_runs")
    .insert({
      automation_id: automationIdForRun,
      user_id: null, // Let the trigger set it from auth.uid()
      automation_status: "running",
      started_at: new Date().toISOString(),
      finished_at: null, // Explicitly set to null - will be updated when run completes
    })
    .select()
    .single());

  if (runError) {
    console.error("[executeAutomation] Failed to create automation run:", runError);
  } else {
    console.log("[executeAutomation] Run created successfully:", run.id);
  }

  let result: AutomationExecutionResult;

  try {
    switch (automation.action_type_type || automation.action_type) {
      case "email":
        result = await executeEmailAutomation(automation, options?.clientEmail);
        break;

      case "meeting":
        result = await executeMeetingFollowUpAutomation(automation, options?.clientEmail);
        break;

      case "ai-summary":
        result = await executeAIClientSummaryAutomation(automation);
        break;

      default:
        result = {
          success: false,
          message: `Unknown automation type: ${automation.action_type_type || automation.action_type}`,
        };
    }

    // Update run status and save result data (especially for AI summaries)
    if (run) {
      const updateData: any = {
        automation_status: result.success ? "completed" : "failed",
        error_message: result.success ? null : result.message,
        finished_at: new Date().toISOString(),
      };
      
      // Save result data for AI summaries
      if (result.success && result.data && (automation.action_type_type === "ai-summary" || automation.action_type === "ai-summary")) {
        updateData.result_data = result.data;
        console.log("Saving result_data to automation_runs:", {
          runId: run.id,
          resultData: result.data,
        });
      }
      
      const { error: updateError } = await ((supabase as any)
        .from("automation_runs")
        .update(updateData)
        .eq("id", run.id));
      
      if (updateError) {
        console.error("Error updating automation run:", updateError);
      } else {
        console.log("Automation run updated successfully");
      }
    }

    return result;
  } catch (error: any) {
    // Update run status on error
    if (run) {
      await ((supabase as any)
        .from("automation_runs")
        .update({
          automation_status: "failed",
          error_message: error.message,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id));
    }

    return {
      success: false,
      message: error.message || "Failed to execute automation",
    };
  }
}
