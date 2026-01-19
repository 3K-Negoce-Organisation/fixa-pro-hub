# Export des Edge Functions - Vis-à-Bois

Ce document contient toutes les edge functions du projet pour migration vers une base Supabase externe.

## Configuration requise (config.toml)

```toml
project_id = "YOUR_NEW_PROJECT_ID"

[functions.create-admin-user]
verify_jwt = false

[functions.send-contact-email]
verify_jwt = false

[functions.gdpr-delete-account]
verify_jwt = false

[functions.gdpr-export-data]
verify_jwt = false

[functions.create-payment-intent]
verify_jwt = false

[functions.create-stripe-checkout]
verify_jwt = false

[functions.admin-update-order]
verify_jwt = false

[functions.update-order-status]
verify_jwt = false

[functions.simulate-order-webhook]
verify_jwt = false

[functions.stripe-webhook]
verify_jwt = false

[functions.update-user-email]
verify_jwt = false
```

## Secrets à configurer

Les secrets suivants doivent être configurés dans le nouveau projet Supabase:

| Secret | Description |
|--------|-------------|
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (sk_live_xxx ou sk_test_xxx) |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook Stripe (whsec_xxx) |
| `RESEND_API_KEY` | Clé API Resend pour les emails (re_xxx) |
| `N8N_WEBHOOK_URL` | URL du webhook n8n pour fulfillment |
| `ORDER_UPDATE_API_KEY` | Clé API pour les mises à jour de commandes externes |

## Structure des fichiers

```
supabase/functions/
├── admin-update-order/
│   └── index.ts
├── create-admin-user/
│   └── index.ts
├── create-payment-intent/
│   └── index.ts
├── create-stripe-checkout/
│   └── index.ts
├── gdpr-delete-account/
│   └── index.ts
├── gdpr-export-data/
│   └── index.ts
├── send-contact-email/
│   └── index.ts
├── simulate-order-webhook/
│   └── index.ts
├── stripe-webhook/
│   └── index.ts
├── update-order-status/
│   └── index.ts
└── update-user-email/
    └── index.ts
```

---

## 1. create-admin-user/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create user with admin API
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User created successfully:", user.user?.id);

    return new Response(
      JSON.stringify({ success: true, userId: user.user?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 2. send-contact-email/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, subject, message }: ContactRequest = await req.json();

    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Tous les champs obligatoires doivent être remplis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Format d'email invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending contact email from ${name} (${email})`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Vis-à-Bois <contact@vis-a-bois.com>",
        to: ["contact@vis-a-bois.com"],
        reply_to: email,
        subject: `[Contact] ${subject}`,
        html: `
          <h2>Nouveau message de contact</h2>
          <p><strong>Nom:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${phone ? `<p><strong>Téléphone:</strong> ${phone}</p>` : ''}
          <p><strong>Sujet:</strong> ${subject}</p>
          <hr />
          <h3>Message:</h3>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error("Erreur lors de l'envoi de l'email");
    }

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, message: "Message envoyé avec succès" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur lors de l'envoi du message" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
```

---

## 3. gdpr-delete-account/index.ts

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    console.log(`GDPR Account Deletion requested for user: ${user.id}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Anonymize orders
    const { error: ordersError } = await supabaseAdmin
      .from("orders")
      .update({
        shipping_name: "COMPTE SUPPRIMÉ",
        shipping_address: null,
        shipping_city: null,
        shipping_postal_code: null,
        user_email: "supprime@rgpd.local",
        notes: "Données personnelles effacées - RGPD Art. 17",
      })
      .eq("user_id", user.id);

    if (ordersError) {
      console.error("Error anonymizing orders:", ordersError);
    }

    // Delete profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", user.id);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
    }

    // Delete user roles
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", user.id);

    if (rolesError) {
      console.error("Error deleting user roles:", rolesError);
    }

    // Delete user from auth.users
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      console.error("Error deleting user:", deleteUserError);
      throw new Error("Failed to delete user account");
    }

    console.log(`GDPR Account Deletion completed for user: ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Compte et données supprimés avec succès" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("GDPR Delete Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

---

## 4. gdpr-export-data/index.ts

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    console.log(`GDPR Data Export requested for user: ${user.id}`);

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: orders } = await supabaseClient
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total_ht,
        total_ttc,
        shipping_address,
        shipping_city,
        shipping_postal_code,
        shipping_name,
        created_at,
        order_items (
          product_title,
          variant_title,
          quantity,
          unit_price_ht,
          unit_price_ttc
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const exportData = {
      export_date: new Date().toISOString(),
      export_format: "RGPD - Article 15 - Droit d'accès",
      user_information: {
        email: user.email,
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at,
      },
      profile: profile ? {
        company_name: profile.company_name,
        phone: profile.phone,
        billing_address: profile.billing_address,
        billing_city: profile.billing_city,
        billing_postal_code: profile.billing_postal_code,
        shipping_address: profile.shipping_address,
        shipping_city: profile.shipping_city,
        shipping_postal_code: profile.shipping_postal_code,
        same_as_billing: profile.same_as_billing,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      } : null,
      consents: profile ? {
        marketing_consent: profile.marketing_consent,
        marketing_consent_date: profile.marketing_consent_date,
        newsletter_consent: profile.newsletter_consent,
        newsletter_consent_date: profile.newsletter_consent_date,
      } : null,
      orders: orders || [],
      data_retention_info: {
        description: "Vos données sont conservées conformément à notre politique de confidentialité.",
        legal_basis: "Exécution du contrat et obligations légales",
      },
    };

    console.log(`GDPR Export completed for user: ${user.id}`);

    return new Response(JSON.stringify(exportData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("GDPR Export Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

---

## 5. create-payment-intent/index.ts

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-INTENT] ${step}${detailsStr}`);
};

interface CartItem {
  id: string;
  variantId: string;
  title: string;
  variantTitle: string;
  priceHT: number;
  image: string;
  quantity: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    let userEmail: string | undefined;
    let userId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      userEmail = userData.user?.email;
      userId = userData.user?.id;
      logStep("User authenticated", { userId, email: userEmail });
    }

    const { items, guestEmail } = await req.json() as { items: CartItem[]; guestEmail?: string };
    logStep("Received cart items", { itemCount: items.length, isGuest: !userId });

    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    const TVA_RATE = 0.20;
    const totalHT = items.reduce((sum, item) => sum + (item.priceHT * item.quantity), 0);
    const totalTTC = totalHT * (1 + TVA_RATE);
    const amountInCents = Math.round(totalTTC * 100);
    logStep("Calculated totals", { totalHT, totalTTC, amountInCents });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let customerId: string | undefined;
    const emailToUse = userEmail || guestEmail;
    
    if (emailToUse) {
      const customers = await stripe.customers.list({ email: emailToUse, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer", { customerId });
      } else {
        const customer = await stripe.customers.create({
          email: emailToUse,
          metadata: userId ? { user_id: userId } : { guest: "true" },
        });
        customerId = customer.id;
        logStep("Created new Stripe customer", { customerId, isGuest: !userId });
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: userId || "guest",
        user_email: emailToUse || "",
        is_guest: (!userId).toString(),
        total_ht: totalHT.toFixed(2),
        total_ttc: totalTTC.toFixed(2),
        items_compact: JSON.stringify(items.map(i => ({
          i: i.id,
          q: i.quantity,
          p: i.priceHT,
        }))),
        items_count: items.length.toString(),
      },
    });

    logStep("PaymentIntent created", { 
      paymentIntentId: paymentIntent.id, 
      clientSecret: paymentIntent.client_secret?.substring(0, 20) + "...",
      isGuest: !userId,
    });

    return new Response(JSON.stringify({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountInCents,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

---

## 6. create-stripe-checkout/index.ts

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-STRIPE-CHECKOUT] ${step}${detailsStr}`);
};

interface CartItem {
  id: string;
  variantId: string;
  title: string;
  variantTitle: string;
  priceHT: number;
  image: string;
  quantity: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    let userEmail: string | undefined;
    let userId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      userEmail = userData.user?.email;
      userId = userData.user?.id;
      logStep("User authenticated", { userId, email: userEmail });
    }

    const { items } = await req.json() as { items: CartItem[] };
    logStep("Received cart items", { itemCount: items.length });

    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    const TVA_RATE = 0.20;
    const totalHT = items.reduce((sum, item) => sum + (item.priceHT * item.quantity), 0);
    const totalTTC = totalHT * (1 + TVA_RATE);
    logStep("Calculated totals", { totalHT, totalTTC });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer", { customerId });
      }
    }

    const lineItems = items.map(item => {
      const unitAmountTTC = Math.round(item.priceHT * (1 + TVA_RATE) * 100);
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.title,
            description: item.variantTitle !== "Unité" ? item.variantTitle : undefined,
            images: item.image && item.image !== "/placeholder.svg" ? [item.image] : undefined,
            metadata: {
              product_id: item.id,
              variant_id: item.variantId,
            },
          },
          unit_amount: unitAmountTTC,
        },
        quantity: item.quantity,
      };
    });
    logStep("Built line items", { count: lineItems.length });

    const origin = req.headers.get("origin") || "https://vis-a-bois.fr";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/paiement-annule`,
      shipping_address_collection: {
        allowed_countries: ['FR'],
      },
      phone_number_collection: {
        enabled: true,
      },
      metadata: {
        user_id: userId || "",
        total_ht: totalHT.toFixed(2),
        total_ttc: totalTTC.toFixed(2),
        items_json: JSON.stringify(items.map(i => ({
          id: i.id,
          variantId: i.variantId,
          title: i.title,
          variantTitle: i.variantTitle,
          priceHT: i.priceHT,
          quantity: i.quantity,
          image: i.image,
        }))),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

---

## 7. admin-update-order/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to get their identity
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.email);

    // Use service role to check admin status (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('User is not admin:', user.email);
      return new Response(
        JSON.stringify({ error: 'Accès refusé - Droits administrateur requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verified:', user.email);

    // Parse request body
    const { order_id, status, tracking_number, carrier } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current order
    const { data: currentOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !currentOrder) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Commande non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number;
    if (carrier !== undefined) updateData.carrier = carrier;
    updateData.updated_at = new Date().toISOString();

    console.log('Updating order:', order_id, 'with:', updateData);

    // Update order using service role
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', order_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la mise à jour', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order updated successfully:', updatedOrder.order_number);

    return new Response(
      JSON.stringify({ 
        success: true, 
        order: updatedOrder,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur inattendue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 8. update-order-status/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      api_key, 
      order_number, 
      status, 
      tracking_number, 
      carrier,
      document_base64,
      document_name,
      document_type 
    } = await req.json();

    // Validate API key
    const expectedApiKey = Deno.env.get('ORDER_UPDATE_API_KEY');
    if (!expectedApiKey || api_key !== expectedApiKey) {
      console.error('Invalid API key provided');
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!order_number) {
      return new Response(
        JSON.stringify({ error: 'order_number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate status if provided
    const validStatuses = ['pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate tracking_number and carrier are required for "shipped" status
    if (status === 'shipped') {
      if (!tracking_number) {
        return new Response(
          JSON.stringify({ error: 'tracking_number is required when status is "shipped"' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!carrier) {
        return new Response(
          JSON.stringify({ error: 'carrier is required when status is "shipped"' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate document fields if document is provided
    if (document_base64 && !document_name) {
      return new Response(
        JSON.stringify({ error: 'document_name is required when uploading a document' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if order exists
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, status, documents')
      .eq('order_number', order_number.toUpperCase())
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Error fetching order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingOrder) {
      return new Response(
        JSON.stringify({ error: `Order not found: ${order_number}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number;
    if (carrier !== undefined) updateData.carrier = carrier;

    // Handle document upload if provided
    let uploadedDocumentUrl: string | null = null;
    if (document_base64) {
      try {
        console.log(`Uploading document: ${document_name} for order ${order_number}`);
        
        // Decode base64 to binary
        const binaryString = atob(document_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Determine content type
        const contentType = document_type || 'application/pdf';
        
        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = document_name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${order_number.toUpperCase()}/${timestamp}_${sanitizedName}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('order-documents')
          .upload(filePath, bytes, {
            contentType,
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading document:', uploadError);
          return new Response(
            JSON.stringify({ error: 'Error uploading document', details: uploadError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Document uploaded successfully: ${uploadData.path}`);

        // Get signed URL for the document (valid for 1 year)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('order-documents')
          .createSignedUrl(filePath, 31536000); // 1 year in seconds

        if (signedUrlError) {
          console.error('Error creating signed URL:', signedUrlError);
        }

        uploadedDocumentUrl = signedUrlData?.signedUrl || filePath;

        // Add document to existing documents array
        const existingDocuments = existingOrder.documents || [];
        const newDocument = {
          name: document_name,
          path: filePath,
          url: uploadedDocumentUrl,
          type: contentType,
          uploaded_at: new Date().toISOString(),
        };
        
        updateData.documents = [...existingDocuments, newDocument];
        console.log(`Document added to order. Total documents: ${(updateData.documents as unknown[]).length}`);
        
      } catch (docError) {
        console.error('Error processing document:', docError);
        return new Response(
          JSON.stringify({ error: 'Error processing document', details: String(docError) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', existingOrder.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error updating order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Order ${order_number} updated successfully:`, {
      status: updateData.status,
      tracking_number: updateData.tracking_number,
      carrier: updateData.carrier,
      document_uploaded: !!uploadedDocumentUrl,
    });

    return new Response(
      JSON.stringify({
        success: true,
        order: updatedOrder,
        message: `Order ${order_number} updated successfully`,
        document_url: uploadedDocumentUrl,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 9. simulate-order-webhook/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SIMULATE-WEBHOOK] ${step}${detailsStr}`);
};

// Generate PDF order recap file matching the template format with full styling
function generateOrderPDF(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  customerNumber: string,
  items: any[],
  totalHT: number,
  shippingAddress: { name?: string; line1?: string; line2?: string; city?: string; postal_code?: string } | null
): string {
  const date = new Date();
  const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
  
  // Customer name in uppercase
  const customerNameUpper = (customerName || customerEmail).toUpperCase();
  
  // Create PDF document (A4 landscape for better table fit)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Colors (typed as tuples)
  const headerBlue: [number, number, number] = [30, 58, 95]; // #1E3A5F
  const totalGreen: [number, number, number] = [212, 237, 218]; // #D4EDDA
  const infoDarkBlue = [25, 50, 85];

  // Header section - Date and Customer info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, margin, 15);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(infoDarkBlue[0], infoDarkBlue[1], infoDarkBlue[2]);
  doc.text(`clt ${customerNameUpper}`, pageWidth - margin, 15, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text('commande', margin, 22);
  doc.setFont('helvetica', 'bold');
  doc.text(orderNumber, margin + 25, 22);
  
  doc.setTextColor(infoDarkBlue[0], infoDarkBlue[1], infoDarkBlue[2]);
  doc.text(`N° clt ${customerNumber}`, pageWidth - margin, 22, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Prepare table data
  const tableHeaders = [['Code', 'Désignation', 'Qté', 'Prix au conditionnement', 'Prix total HT net']];
  
  const tableData = items.map(item => {
    const totalItemHT = (item.unit_price_ht || 0) * item.quantity;
    return [
      item.code_alsafix || item.product_id || '',
      item.product_title || '',
      String(item.quantity),
      `${(item.unit_price_ht || 0).toFixed(2)} €`,
      `${totalItemHT.toFixed(2)} €`
    ];
  });

  // Add table with styling
  autoTable(doc, {
    startY: 30,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 30 },  // Code
      1: { cellWidth: 80 },  // Désignation
      2: { cellWidth: 20, halign: 'center' },  // Qté
      3: { cellWidth: 45, halign: 'right' },   // Prix unitaire
      4: { cellWidth: 45, halign: 'right' },   // Prix total
    },
    didParseCell: function(data) {
      // Style for body rows
      if (data.section === 'body') {
        data.cell.styles.fillColor = [255, 255, 255];
      }
    },
  });

  // Get Y position after table
  const finalY = (doc as any).lastAutoTable.finalY || 100;

  // Total row with green background
  const totalRowY = finalY + 2;
  doc.setFillColor(totalGreen[0], totalGreen[1], totalGreen[2]);
  doc.rect(margin, totalRowY, pageWidth - 2 * margin, 10, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(margin, totalRowY, pageWidth - 2 * margin, 10, 'S');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL HT', margin + 130, totalRowY + 7);
  doc.text(`${totalHT.toFixed(2)} €`, pageWidth - margin - 10, totalRowY + 7, { align: 'right' });

  // Shipping address section
  const addressY = totalRowY + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Adresse de livraison', margin, addressY);
  
  doc.setFont('helvetica', 'normal');
  let currentY = addressY + 6;
  
  if (shippingAddress) {
    // Use shipping name if available, otherwise fall back to customerName
    const displayShippingName = shippingAddress.name || customerName;
    if (displayShippingName) {
      doc.text(displayShippingName, margin + 10, currentY);
      currentY += 5;
    }
    if (shippingAddress.line1) {
      doc.text(shippingAddress.line1, margin + 10, currentY);
      currentY += 5;
    }
    if (shippingAddress.line2) {
      doc.text(shippingAddress.line2, margin + 10, currentY);
      currentY += 5;
    }
    if (shippingAddress.postal_code || shippingAddress.city) {
      doc.text(`${shippingAddress.postal_code || ''} ${shippingAddress.city || ''}`.trim(), margin + 10, currentY);
      currentY += 5;
    }
  }

  // Footer note
  currentY += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Livraison direct sans BL chiffré', margin, currentY);

  // Generate base64
  const pdfBase64 = doc.output('datauristring').split(',')[1];
  return pdfBase64;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé - Droits administrateur requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Simulating webhook for order", { order_id });

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Commande non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order items
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', order_id);

    // Get product codes (code_alsafix) for each item by matching on product_title
    const productTitles = (orderItems || []).map(item => item.product_title);
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, title, code_alsafix')
      .in('title', productTitles);

    // Create a map of product_title to code_alsafix
    const productCodeMap = new Map<string, string>();
    (products || []).forEach(p => {
      if (p.code_alsafix) {
        productCodeMap.set(p.title, p.code_alsafix);
      }
    });

    // Enrich order items with code_alsafix (matched by title)
    const enrichedItems = (orderItems || []).map(item => ({
      ...item,
      code_alsafix: productCodeMap.get(item.product_title) || item.product_id,
    }));

    // Get user info
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
    const customerEmail = userData?.user?.email || '';
    const customerName = userData?.user?.user_metadata?.full_name || '';

    // Get profile for more details
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_name, phone')
      .eq('user_id', order.user_id)
      .maybeSingle();

    const displayName = profile?.company_name || customerName || customerEmail;

    // Get supplier settings
    const { data: supplierSettings } = await supabaseAdmin
      .from('supplier_settings')
      .select('*')
      .maybeSingle();

    logStep("Supplier settings fetched", { hasSettings: !!supplierSettings });
    
    // Get customer number from supplier settings (default to "000001")
    const customerNumber = supplierSettings?.customer_number || '000001';

    if (!n8nWebhookUrl) {
      return new Response(
        JSON.stringify({ error: 'N8N_WEBHOOK_URL non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate PDF file
    const pdfBase64 = generateOrderPDF(
      order.order_number,
      displayName,
      customerEmail,
      customerNumber,
      enrichedItems,
      order.total_ht,
      {
        name: order.shipping_name || undefined,
        line1: order.shipping_address || undefined,
        city: order.shipping_city || undefined,
        postal_code: order.shipping_postal_code || undefined,
      }
    );

    logStep("PDF file generated", { size: pdfBase64.length });

    // Store PDF in order-documents bucket
    const pdfFileName = `commande_${order.order_number}.pdf`;
    const pdfPath = `${order.id}/${pdfFileName}`;
    
    // Decode base64 to binary
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from('order-documents')
      .upload(pdfPath, bytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      logStep("Error uploading PDF to storage", { error: uploadError.message });
    } else {
      logStep("PDF uploaded to storage", { path: pdfPath });

      // Generate signed URL (valid for 1 year)
      const { data: signedUrlData } = await supabaseAdmin.storage
        .from('order-documents')
        .createSignedUrl(pdfPath, 60 * 60 * 24 * 365);

      if (signedUrlData?.signedUrl) {
        // Get existing documents
        const existingDocs = Array.isArray(order.documents) ? order.documents : [];
        
        // Check if this document already exists (avoid duplicates)
        const docExists = existingDocs.some((doc: any) => doc.name === pdfFileName);
        
        if (!docExists) {
          const newDocument = {
            name: pdfFileName,
            path: pdfPath,
            url: signedUrlData.signedUrl,
            type: 'application/pdf',
            uploaded_at: new Date().toISOString(),
          };

          // Update order with new document
          const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({
              documents: [...existingDocs, newDocument],
            })
            .eq('id', order.id);

          if (updateError) {
            logStep("Error updating order documents", { error: updateError.message });
          } else {
            logStep("Order documents updated", { docCount: existingDocs.length + 1 });
          }
        } else {
          logStep("Document already exists, skipping", { name: pdfFileName });
        }
      }
    }

    // Build n8n payload
    const n8nPayload = {
      event: "order.paid",
      order_number: order.order_number,
      order_id: order.id,
      simulation: true,
      customer: {
        email: customerEmail,
        phone: profile?.phone || null,
        name: displayName,
        shipping_address: {
          line1: order.shipping_address,
          city: order.shipping_city,
          postal_code: order.shipping_postal_code,
          country: 'FR',
        },
      },
      supplier: supplierSettings ? {
        name: supplierSettings.name || null,
        email: supplierSettings.email || null,
        status_email: supplierSettings.status_email || null,
        address: supplierSettings.address || null,
        postal_code: supplierSettings.postal_code || null,
        city: supplierSettings.city || null,
        phone: supplierSettings.phone || null,
      } : null,
      items: (orderItems || []).map(item => ({
        product_id: item.product_id,
        title: item.product_title,
        variant_title: item.variant_title,
        quantity: item.quantity,
        unit_price_ht: item.unit_price_ht,
        unit_price_ttc: item.unit_price_ttc,
      })),
      totals: {
        ht: order.total_ht,
        ttc: order.total_ttc,
        currency: "EUR",
      },
      pdf_file: {
        filename: pdfFileName,
        content_base64: pdfBase64,
        content_type: "application/pdf",
      },
      created_at: new Date().toISOString(),
    };

    logStep("Sending to n8n", { url: n8nWebhookUrl });

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    });

    const responseStatus = n8nResponse.status;
    let responseBody = '';
    try {
      responseBody = await n8nResponse.text();
    } catch (e) {
      // ignore
    }

    logStep("n8n response", { status: responseStatus, body: responseBody.substring(0, 200) });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Webhook n8n envoyé (status: ${responseStatus})`,
        n8n_status: responseStatus,
        order_number: order.order_number,
        pdf_file: {
          filename: pdfFileName,
          content_base64: pdfBase64,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 10. stripe-webhook/index.ts

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Generate order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `VIS-${year}${month}-${random}`;
}

// Generate PDF order recap file matching the template format with full styling
function generateOrderPDF(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  customerNumber: string,
  items: any[],
  totalHT: number,
  shippingAddress: { name?: string; line1?: string; line2?: string; city?: string; postal_code?: string } | null
): string {
  const date = new Date();
  const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
  
  // Customer name in uppercase
  const customerNameUpper = (customerName || customerEmail).toUpperCase();
  
  // Create PDF document (A4 landscape for better table fit)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Colors (typed as tuples)
  const headerBlue: [number, number, number] = [30, 58, 95]; // #1E3A5F
  const totalGreen: [number, number, number] = [212, 237, 218]; // #D4EDDA
  const infoDarkBlue = [25, 50, 85];

  // Header section - Date and Customer info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, margin, 15);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(infoDarkBlue[0], infoDarkBlue[1], infoDarkBlue[2]);
  doc.text(`clt ${customerNameUpper}`, pageWidth - margin, 15, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text('commande', margin, 22);
  doc.setFont('helvetica', 'bold');
  doc.text(orderNumber, margin + 25, 22);
  
  doc.setTextColor(infoDarkBlue[0], infoDarkBlue[1], infoDarkBlue[2]);
  doc.text(`N° clt ${customerNumber}`, pageWidth - margin, 22, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Prepare table data
  const tableHeaders = [['Code', 'Désignation', 'Qté', 'Prix au conditionnement', 'Prix total HT net']];
  
  const tableData = items.map(item => {
    const priceHT = item.priceHT || item.unit_price_ht || 0;
    const qty = item.quantity || item.q || 1;
    const totalItemHT = priceHT * qty;
    return [
      item.code_alsafix || item.id || item.product_id || '',
      item.title || item.product_title || '',
      String(qty),
      `${priceHT.toFixed(2)} €`,
      `${totalItemHT.toFixed(2)} €`
    ];
  });

  // Add table with styling
  autoTable(doc, {
    startY: 30,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 30 },  // Code
      1: { cellWidth: 80 },  // Désignation
      2: { cellWidth: 20, halign: 'center' },  // Qté
      3: { cellWidth: 45, halign: 'right' },   // Prix unitaire
      4: { cellWidth: 45, halign: 'right' },   // Prix total
    },
    didParseCell: function(data) {
      // Style for body rows
      if (data.section === 'body') {
        data.cell.styles.fillColor = [255, 255, 255];
      }
    },
  });

  // Get Y position after table
  const finalY = (doc as any).lastAutoTable.finalY || 100;

  // Total row with green background
  const totalRowY = finalY + 2;
  doc.setFillColor(totalGreen[0], totalGreen[1], totalGreen[2]);
  doc.rect(margin, totalRowY, pageWidth - 2 * margin, 10, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(margin, totalRowY, pageWidth - 2 * margin, 10, 'S');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL HT', margin + 130, totalRowY + 7);
  doc.text(`${totalHT.toFixed(2)} €`, pageWidth - margin - 10, totalRowY + 7, { align: 'right' });

  // Shipping address section
  const addressY = totalRowY + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Adresse de livraison', margin, addressY);
  
  doc.setFont('helvetica', 'normal');
  let currentY = addressY + 6;
  
  if (shippingAddress) {
    // Use shipping name if available, otherwise fall back to customerName
    const displayShippingName = shippingAddress.name || customerName;
    if (displayShippingName) {
      doc.text(displayShippingName, margin + 10, currentY);
      currentY += 5;
    }
    if (shippingAddress.line1) {
      doc.text(shippingAddress.line1, margin + 10, currentY);
      currentY += 5;
    }
    if (shippingAddress.line2) {
      doc.text(shippingAddress.line2, margin + 10, currentY);
      currentY += 5;
    }
    if (shippingAddress.postal_code || shippingAddress.city) {
      doc.text(`${shippingAddress.postal_code || ''} ${shippingAddress.city || ''}`.trim(), margin + 10, currentY);
      currentY += 5;
    }
  }

  // Footer note
  currentY += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Livraison direct sans BL chiffré', margin, currentY);

  // Generate base64
  const pdfBase64 = doc.output('datauristring').split(',')[1];
  return pdfBase64;
}

// Fetch full product details from Supabase
async function fetchProductDetails(supabaseAdmin: any, productIds: string[]): Promise<Map<string, any>> {
  const productMap = new Map();
  
  if (productIds.length === 0) return productMap;
  
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, title, handle, images, code_alsafix')
    .in('id', productIds);
  
  if (error) {
    logStep("Error fetching products", { error: error.message });
    return productMap;
  }
  
  for (const product of products || []) {
    productMap.set(product.id, product);
  }
  
  return productMap;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify webhook signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No Stripe signature found");

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Webhook signature verified", { eventType: event.type });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logStep("Webhook signature verification failed", { error: message });
      return new Response(JSON.stringify({ error: `Webhook Error: ${message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle payment_intent.succeeded (from Stripe Elements PaymentIntent flow)
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logStep("Processing PaymentIntent succeeded", { paymentIntentId: paymentIntent.id });

      const metadata = paymentIntent.metadata || {};
      const userId = metadata.user_id !== "guest" ? metadata.user_id : null;
      const userEmail = metadata.user_email || null;
      const totalHT = parseFloat(metadata.total_ht || "0");
      const totalTTC = parseFloat(metadata.total_ttc || "0");
      const itemsCompact = metadata.items_compact;

      logStep("PaymentIntent metadata", { userId, userEmail, totalHT, totalTTC });

      // Parse compact items from metadata
      let cartItems: any[] = [];
      try {
        const compactItems = JSON.parse(itemsCompact || "[]");
        // Compact format: { i: id, q: quantity, p: priceHT }
        cartItems = compactItems.map((item: any) => ({
          id: item.i,
          quantity: item.q,
          priceHT: item.p,
        }));
        logStep("Parsed compact items", { count: cartItems.length });
      } catch (e) {
        logStep("Failed to parse items_compact", { error: String(e) });
      }

      // Fetch full product details from Supabase
      const productIds = cartItems.map(item => item.id);
      const productMap = await fetchProductDetails(supabaseAdmin, productIds);
      
      // Enrich cart items with product details
      cartItems = cartItems.map(item => {
        const product = productMap.get(item.id);
        return {
          ...item,
          title: product?.title || `Product ${item.id}`,
          handle: product?.handle || '',
          image: product?.images?.[0]?.url || '',
          code_alsafix: product?.code_alsafix || item.id,
          variantTitle: 'Default',
        };
      });
      logStep("Enriched cart items with product details");

      // Get shipping details from PaymentIntent (if collected via Stripe Elements)
      // Note: For PaymentIntent flow, shipping is typically collected separately
      // We'll try to get it from the associated charges
      let shippingAddress: any = null;
      let customerName: string | null = null;

      // Try to get shipping from the latest charge
      if (paymentIntent.latest_charge) {
        try {
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
          if (charge.shipping) {
            shippingAddress = charge.shipping.address;
            customerName = charge.shipping.name;
            logStep("Got shipping from charge", { address: shippingAddress, name: customerName });
          }
        } catch (e) {
          logStep("Could not retrieve charge shipping", { error: String(e) });
        }
      }

      // Generate order number
      const orderNumber = generateOrderNumber();
      logStep("Generated order number", { orderNumber });

      // Create order in Supabase
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: userId,
          user_email: userEmail,
          status: "paid",
          total_ht: totalHT,
          total_ttc: totalTTC,
          shipping_address: shippingAddress 
            ? `${shippingAddress.line1 || ''}${shippingAddress.line2 ? ', ' + shippingAddress.line2 : ''}`
            : null,
          shipping_city: shippingAddress?.city || null,
          shipping_postal_code: shippingAddress?.postal_code || null,
          shipping_name: customerName,
          notes: `Stripe PaymentIntent: ${paymentIntent.id}`,
        })
        .select()
        .single();

      if (orderError) {
        logStep("Error creating order", { error: orderError.message });
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      logStep("Order created", { orderId: order.id, orderNumber });

      // Create order items
      if (cartItems.length > 0) {
        const orderItems = cartItems.map(item => ({
          order_id: order.id,
          product_id: item.id,
          product_title: item.title,
          variant_title: item.variantTitle || 'Default',
          product_image: item.image || null,
          quantity: item.quantity,
          unit_price_ht: item.priceHT,
          unit_price_ttc: item.priceHT * 1.20,
        }));

        const { error: itemsError } = await supabaseAdmin
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          logStep("Error creating order items", { error: itemsError.message });
        } else {
          logStep("Order items created", { count: orderItems.length });
        }
      }

      // Send webhook to n8n for fulfillment
      if (n8nWebhookUrl) {
        await sendToN8n(
          n8nWebhookUrl,
          supabaseAdmin,
          orderNumber,
          order.id,
          paymentIntent.id,
          customerName,
          userEmail,
          null, // phone
          shippingAddress,
          cartItems,
          totalHT,
          totalTTC
        );
      } else {
        logStep("N8N_WEBHOOK_URL not configured, skipping fulfillment notification");
      }

      logStep("PaymentIntent processing complete");
    }

    // Handle checkout.session.completed (kept for backwards compatibility)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout session", { sessionId: session.id });

      // Get session details with line items
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items', 'customer_details'],
      });

      const metadata = fullSession.metadata || {};
      const userId = metadata.user_id;
      const totalHT = parseFloat(metadata.total_ht || "0");
      const totalTTC = parseFloat(metadata.total_ttc || "0");
      const itemsJson = metadata.items_json;

      logStep("Session metadata", { userId, totalHT, totalTTC });

      // Parse cart items from metadata
      let cartItems: any[] = [];
      try {
        cartItems = JSON.parse(itemsJson || "[]");
      } catch (e) {
        logStep("Failed to parse items_json", { error: String(e) });
      }

      // Fetch full product details to get code_alsafix
      const productIds = cartItems.map(item => item.id);
      const productMap = await fetchProductDetails(supabaseAdmin, productIds);
      
      // Enrich cart items with code_alsafix
      cartItems = cartItems.map(item => {
        const product = productMap.get(item.id);
        return {
          ...item,
          code_alsafix: product?.code_alsafix || item.id,
        };
      });

      // Generate order number
      const orderNumber = generateOrderNumber();
      logStep("Generated order number", { orderNumber });

      // Extract shipping address
      const shippingDetails = fullSession.shipping_details;
      const shippingAddress = shippingDetails?.address;

      // Extract customer email
      const customerEmail = fullSession.customer_details?.email || fullSession.customer_email || null;

      // Create order in Supabase
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: userId,
          user_email: customerEmail,
          status: "paid",
          total_ht: totalHT,
          total_ttc: totalTTC,
          shipping_address: shippingAddress 
            ? `${shippingAddress.line1}${shippingAddress.line2 ? ', ' + shippingAddress.line2 : ''}`
            : null,
          shipping_city: shippingAddress?.city || null,
          shipping_postal_code: shippingAddress?.postal_code || null,
          notes: `Stripe Session: ${session.id}`,
        })
        .select()
        .single();

      if (orderError) {
        logStep("Error creating order", { error: orderError.message });
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      logStep("Order created", { orderId: order.id, orderNumber });

      // Create order items
      if (cartItems.length > 0) {
        const orderItems = cartItems.map(item => ({
          order_id: order.id,
          product_id: item.id,
          product_title: item.title,
          variant_title: item.variantTitle,
          product_image: item.image,
          quantity: item.quantity,
          unit_price_ht: item.priceHT,
          unit_price_ttc: item.priceHT * 1.20,
        }));

        const { error: itemsError } = await supabaseAdmin
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          logStep("Error creating order items", { error: itemsError.message });
        } else {
          logStep("Order items created", { count: orderItems.length });
        }
      }

      // Send webhook to n8n for fulfillment
      if (n8nWebhookUrl) {
        await sendToN8n(
          n8nWebhookUrl,
          supabaseAdmin,
          orderNumber,
          order.id,
          session.id,
          shippingDetails?.name || fullSession.customer_details?.name || null,
          customerEmail,
          fullSession.customer_details?.phone || null,
          shippingAddress ? {
            name: shippingDetails?.name || undefined,
            line1: shippingAddress.line1 || undefined,
            line2: shippingAddress.line2 || undefined,
            city: shippingAddress.city || undefined,
            postal_code: shippingAddress.postal_code || undefined,
            country: shippingAddress.country || undefined,
          } : null,
          cartItems,
          totalHT,
          totalTTC
        );
      } else {
        logStep("N8N_WEBHOOK_URL not configured, skipping fulfillment notification");
      }

      logStep("Checkout session processing complete");
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper function to send to n8n and save document
async function sendToN8n(
  n8nWebhookUrl: string,
  supabaseAdmin: any,
  orderNumber: string,
  orderId: string,
  stripeId: string,
  customerName: string | null,
  customerEmail: string | null,
  customerPhone: string | null,
  shippingAddress: any,
  cartItems: any[],
  totalHT: number,
  totalTTC: number
) {
  try {
    // Get supplier settings
    const { data: supplierSettings } = await supabaseAdmin
      .from('supplier_settings')
      .select('*')
      .maybeSingle();

    logStep("Supplier settings fetched", { hasSettings: !!supplierSettings });

    // Get customer number from supplier settings (default to "000001")
    const customerNumber = supplierSettings?.customer_number || '000001';

    // Generate PDF recap file (replaces Excel for Deno Edge compatibility)
    const pdfBase64 = generateOrderPDF(
      orderNumber,
      customerName || '',
      customerEmail || '',
      customerNumber,
      cartItems,
      totalHT,
      shippingAddress ? {
        name: shippingAddress.name || customerName || undefined,
        line1: shippingAddress.line1 || undefined,
        line2: shippingAddress.line2 || undefined,
        city: shippingAddress.city || undefined,
        postal_code: shippingAddress.postal_code || undefined,
      } : null
    );

    logStep("PDF file generated", { size: pdfBase64.length });

    // Upload PDF to Supabase Storage and update order documents
    const pdfFileName = `commande_${orderNumber}.pdf`;
    const filePath = `${orderId}/${pdfFileName}`;
    
    try {
      // Decode base64 and upload to storage
      const binaryString = atob(pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabaseAdmin.storage
        .from('order-documents')
        .upload(filePath, bytes, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        logStep("Error uploading PDF to storage", { error: uploadError.message });
      } else {
        logStep("PDF uploaded to storage", { filePath });

        // Create signed URL for the document (valid for 1 year)
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from('order-documents')
          .createSignedUrl(filePath, 60 * 60 * 24 * 365);

        if (signedUrlError) {
          logStep("Error creating signed URL", { error: signedUrlError.message });
        } else {
          // Update order with document reference
          const newDocument = {
            name: pdfFileName,
            type: 'order_confirmation',
            url: signedUrlData.signedUrl,
            created_at: new Date().toISOString(),
            status: 'paid'
          };

          // Get current documents array
          const { data: currentOrder } = await supabaseAdmin
            .from('orders')
            .select('documents')
            .eq('id', orderId)
            .single();

          const existingDocuments = currentOrder?.documents || [];
          const updatedDocuments = [...existingDocuments, newDocument];

          const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ documents: updatedDocuments })
            .eq('id', orderId);

          if (updateError) {
            logStep("Error updating order with document", { error: updateError.message });
          } else {
            logStep("Order updated with document reference", { documentCount: updatedDocuments.length });
          }
        }
      }
    } catch (storageError) {
      logStep("Storage operation failed", { error: String(storageError) });
    }

    const n8nPayload = {
      event: "order.paid",
      order_number: orderNumber,
      order_id: orderId,
      stripe_id: stripeId,
      customer: {
        email: customerEmail,
        phone: customerPhone,
        name: customerName,
        shipping_address: shippingAddress,
      },
      supplier: supplierSettings ? {
        name: supplierSettings.name || null,
        email: supplierSettings.email || null,
        status_email: supplierSettings.status_email || null,
        address: supplierSettings.address || null,
        postal_code: supplierSettings.postal_code || null,
        city: supplierSettings.city || null,
        phone: supplierSettings.phone || null,
      } : null,
      items: cartItems.map(item => ({
        product_id: item.id || item.product_id,
        code_alsafix: item.code_alsafix || item.id,
        variant_id: item.variantId || item.id,
        title: item.title || item.product_title,
        variant_title: item.variantTitle || 'Default',
        quantity: item.quantity || item.q || 1,
        unit_price_ht: item.priceHT || item.unit_price_ht || 0,
        unit_price_ttc: (item.priceHT || item.unit_price_ht || 0) * 1.20,
      })),
      totals: {
        ht: totalHT,
        ttc: totalTTC,
        currency: "EUR",
      },
      // PDF file as base64 (replaces excel_file for Deno Edge compatibility)
      pdf_file: {
        filename: pdfFileName,
        content_base64: pdfBase64,
        content_type: "application/pdf",
      },
      created_at: new Date().toISOString(),
    };

    logStep("Sending to n8n", { url: n8nWebhookUrl });

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    });

    logStep("n8n response", { status: n8nResponse.status });
  } catch (n8nError) {
    logStep("n8n webhook failed (non-blocking)", { error: String(n8nError) });
  }
}
```

---

## 11. update-user-email/index.ts

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { user_id, new_email } = await req.json();

    if (!user_id || !new_email) {
      return new Response(
        JSON.stringify({ error: "user_id and new_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      email: new_email,
      email_confirm: true,
    });

    if (error) {
      console.error("Error updating user email:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User email updated successfully:", data.user.email);

    return new Response(
      JSON.stringify({ success: true, user: { id: data.user.id, email: data.user.email } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## Instructions de déploiement

### 1. Via Supabase CLI

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier au nouveau projet
supabase link --project-ref YOUR_PROJECT_REF

# Déployer TOUTES les fonctions avec --no-verify-jwt
supabase functions deploy create-admin-user --no-verify-jwt
supabase functions deploy send-contact-email --no-verify-jwt
supabase functions deploy gdpr-delete-account --no-verify-jwt
supabase functions deploy gdpr-export-data --no-verify-jwt
supabase functions deploy create-payment-intent --no-verify-jwt
supabase functions deploy create-stripe-checkout --no-verify-jwt
supabase functions deploy admin-update-order --no-verify-jwt
supabase functions deploy update-order-status --no-verify-jwt
supabase functions deploy simulate-order-webhook --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy update-user-email --no-verify-jwt
```

### 2. Configurer les secrets

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set N8N_WEBHOOK_URL=https://xxx.app.n8n.cloud/webhook/xxx
supabase secrets set ORDER_UPDATE_API_KEY=xxx
```

### 3. Configurer le webhook Stripe

Dans le dashboard Stripe (https://dashboard.stripe.com/webhooks), créer un webhook pointant vers:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

**Événements à écouter:**
- `payment_intent.succeeded`
- `checkout.session.completed`

---

## Notes importantes

1. **URLs à mettre à jour dans le code frontend** après migration:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY`

2. **Domaine Resend**: Vérifier que `vis-a-bois.com` est bien configuré dans Resend (https://resend.com/domains)

3. **Stripe API Version**: Les fonctions utilisent `apiVersion: "2025-08-27.basil"`

4. **Storage bucket**: S'assurer que le bucket `order-documents` existe et est privé

5. **RLS Policies**: Les fonctions utilisent le `SUPABASE_SERVICE_ROLE_KEY` pour contourner les RLS policies
