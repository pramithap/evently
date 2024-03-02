import { IEvent } from "@/lib/database/modals/event.modal";
import React from "react";
import { Button } from "../button";

const CheckoutButton = ({
  event,
  userId,
}: {
  event: IEvent;
  userId: string;
}) => {
  return (
    <div>
      <Button type="submit" role="link" size="lg" className="button sm:w-fit">
        {event.isFree ? "Get Ticket" : "Buy Ticket"} {userId}
      </Button>
    </div>
  );
};

export default CheckoutButton;
