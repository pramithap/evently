import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const mockPush = jest.fn();
export const mockBack = jest.fn();

/** Points the mocked next/navigation hooks (see jest.mock in tests) at a URL. */
export function setUrl(url: string) {
  const { pathname, search } = new URL(url, "http://localhost");
  window.history.pushState({}, "", url);
  (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack });
  (usePathname as jest.Mock).mockReturnValue(pathname);
  (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams(search));
}
