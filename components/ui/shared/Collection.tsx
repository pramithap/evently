import { IEvent } from "@/lib/database/modals/event.modal";
import React from "react";
import Card from "./Card";

type CollectionProps = {
  data: IEvent[];
  emptyTitle: string;
  emptyStateSubtext: string;
  limit: number;
  page: number | string;
  totalPages?: number;
  urlParamName?: string;
  collectionType?: "Events_Organized" | "My_Tickets" | "All_Events";
};

const Collection = ({
  data,
  emptyTitle,
  emptyStateSubtext,
  collectionType,
  limit,
  page,
  totalPages,
}: CollectionProps) => {
  return (
    <>
      {data.length > 0 ? (
        <div className="flex flex-col items-center gap-10">
          <ul className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-10">
            {data.map((item) => {
              const hasOrderLink = collectionType === "Events_Organized";
              const hidePrice = collectionType === "My_Tickets";
              return (
                <li key={item._id} className="flex justify-center">
                  <Card
                    event={item}
                    hasOrderLink={hasOrderLink}
                    hidePrice={hidePrice}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div
          className="flex-center wrapper min-h-[200px] w-full flex-col gap-3 rounded-[140px]
         bg-grey-50 py-28 tet-center"
        >
          <h3 className="p-bold-20 md:h5-bold">{emptyTitle}</h3>
          <p className="p-regualr-14">{emptyStateSubtext}</p>
        </div>
      )}
    </>
  );
};

export default Collection;