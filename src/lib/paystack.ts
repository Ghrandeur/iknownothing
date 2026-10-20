const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export async function initializePaystackPayment({
  email,
  amount,
  reference,
  callbackUrl,
}: {
  email: string;
  amount: number;
  reference: string;
  callbackUrl: string;
}) {
  if (!PAYSTACK_SECRET) {
    return {
      status: true,
      data: {
        authorization_url: callbackUrl + `?reference=${reference}&mock=1`,
        reference,
        mock: true,
      },
    };
  }

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amount * 100,
      reference,
      callback_url: callbackUrl,
    }),
  });
  return res.json();
}

export async function verifyPaystackTransaction(reference: string) {
  if (!PAYSTACK_SECRET) {
    return {
      status: true,
      data: { status: "success", reference, gateway_response: "Mock verification" },
    };
  }
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    }
  );
  return res.json();
}
