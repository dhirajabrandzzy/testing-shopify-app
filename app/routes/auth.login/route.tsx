import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 16 }}>Log in</h1>
      <Form method="post" style={{ display: "grid", gap: 10 }}>
        <label>
          Shop domain
          <input
            name="shop"
            type="text"
            placeholder="example.myshopify.com"
            value={shop}
            onChange={(e) => setShop(e.currentTarget.value)}
            autoComplete="on"
            style={{ width: "100%", marginTop: 4, padding: 8 }}
          />
        </label>
        {errors.shop ? (
          <p style={{ color: "#b00020", margin: 0 }}>{errors.shop}</p>
        ) : null}
        <button type="submit" style={{ width: 120, padding: "8px 10px" }}>
          Log in
        </button>
      </Form>
    </main>
  );
}
