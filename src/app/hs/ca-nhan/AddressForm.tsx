"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui";
import { updateOwnAddressAction } from "./actions";

export function AddressForm({ address }: { address: string }) {
  const [state, action, pending] = useActionState(updateOwnAddressAction, null);
  return (
    <form action={action} className="space-y-2">
      <label className="label" htmlFor="address">
        Địa chỉ hiện tại
      </label>
      <div className="flex gap-2">
        <input id="address" name="address" className="input" defaultValue={address} />
        <button className="btn-primary" disabled={pending}>
          {pending ? "..." : "Lưu"}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
