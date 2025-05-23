import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    onChange();
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)

  }, [window.innerWidth])

  return !!isMobile
}
