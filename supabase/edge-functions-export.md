# Export des Edge Functions - Vis-à-Bois

Ce document contient toutes les edge functions du projet pour migration vers une base Supabase externe.

## Configuration requise (config.toml)

```toml
project_id = "YOUR_NEW_PROJECT_ID"

[functions.update-order-status]
verify_jwt = false

[functions.admin-update-order]
verify_jwt = true

[functions.create-stripe-checkout]
verify_jwt = true

[functions.create-payment-intent]
verify_jwt = true

[functions.stripe-webhook]
verify_jwt = false

[functions.simulate-order-webhook]
verify_jwt = true

[functions.send-contact-email]
verify_jwt = false

[functions.create-admin-user]
verify_jwt = false

[functions.gdpr-delete-account]
verify_jwt = true

[functions.gdpr-export-data]
verify_jwt = true
```

## Secrets à configurer

Les secrets suivants doivent être configurés dans le nouveau projet Supabase:

- `STRIPE_SECRET_KEY` - Clé secrète Stripe
- `STRIPE_WEBHOOK_SECRET` - Secret du webhook Stripe
- `RESEND_API_KEY` - Clé API Resend pour les emails
- `N8N_WEBHOOK_URL` - URL du webhook n8n pour fulfillment
- `ORDER_UPDATE_API_KEY` - Clé API pour les mises à jour de commandes externes

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
└── update-order-status/
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

Voir le fichier original: `supabase/functions/admin-update-order/index.ts`

---

## 8. update-order-status/index.ts

Voir le fichier original: `supabase/functions/update-order-status/index.ts`

---

## 9. simulate-order-webhook/index.ts

Voir le fichier original: `supabase/functions/simulate-order-webhook/index.ts`

---

## 10. stripe-webhook/index.ts

Voir le fichier original: `supabase/functions/stripe-webhook/index.ts`

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

# Déployer toutes les fonctions
supabase functions deploy
```

### 2. Configurer les secrets

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set N8N_WEBHOOK_URL=https://xxx
supabase secrets set ORDER_UPDATE_API_KEY=xxx
```

### 3. Configurer le webhook Stripe

Dans le dashboard Stripe, créer un webhook pointant vers:
`https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`

Événements à écouter:
- `payment_intent.succeeded`
- `checkout.session.completed`

---

## Notes importantes

1. **URLs à mettre à jour dans le code frontend** après migration:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

2. **Domaine Resend**: Vérifier que `vis-a-bois.com` est bien configuré dans Resend

3. **Stripe API Version**: Les fonctions utilisent `apiVersion: "2025-08-27.basil"`
