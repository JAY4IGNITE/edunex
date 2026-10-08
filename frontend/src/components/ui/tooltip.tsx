import type { ReactNode } from "react";
import { Tooltip as Primitive } from "radix-ui";

export function Tooltip({
  children,
  content,
}: {
  children: ReactNode;
  content: string;
}) {
  return (
    <Primitive.Provider delayDuration={300}>
      <Primitive.Root>
        <Primitive.Trigger asChild>{children}</Primitive.Trigger>
        <Primitive.Portal>
          <Primitive.Content className="ui-tooltip" sideOffset={8}>
            {content}
            <Primitive.Arrow className="tooltip-arrow" />
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </Primitive.Provider>
  );
}
