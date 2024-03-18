"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Input } from "../input";
import { useRouter, useSearchParams } from "next/navigation";
import { formUrlQuery, removeKeysFromQuery } from "@/lib/utils";

const Search = ({
  placeholder = "Search title...",
}: {
  placeholder?: string;
}) => {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  //triggers every time the query changes
  // debounce funcion eliminates so many unnecessary API calls
  //updates only every 300 miliseconds
  /*setTimeout: Inside the useEffect, a setTimeout is declared, 
  delaying the execution of its callback function for 300 milliseconds. 
  This is a debouncing technique, which ensures that the URL is not updated on every single keystroke 
  but rather after the user has stopped typing for a brief period (300ms in this case). 
  This improves performance and reduces the number of unnecessary operations (like API calls, if any).*/
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      let newUrl = "";

      if (query) {
        newUrl = formUrlQuery({
          params: searchParams.toString(),
          key: "query",
          value: query,
        });
      } else {
        newUrl = removeKeysFromQuery({
          params: searchParams.toString(),
          keysToRemove: ["query"],
        });
      }

      /*a cleanup function that runs before the component unmounts or before the effect runs again. 
      In this case, it clears the timeout to prevent the effect from running after the component has 
      unmounted or if the dependencies change before the timeout completes. 
      This is a necessary step to avoid memory leaks and unexpected behavior.*/
      router.push(newUrl, { scroll: false });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, searchParams, router]);

  return (
    <div className="flex-center min-h-[54px] w-full overflow-hidden rounded-full bg-grey-50 px-4 py-2">
      <Image
        src="/assets/icons/search.svg"
        alt="search"
        width={24}
        height={24}
      />
      <Input
        type="text"
        placeholder={placeholder}
        onChange={(e) => setQuery(e.target.value)}
        className="p-regular-16 border-0 bg-grey-50 outline-offset-0 placeholder:text-grey-500 focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
};

export default Search;
