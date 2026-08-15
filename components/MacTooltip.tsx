import { Tooltip } from "@ark-ui/solid/tooltip";
import type { JSX } from "@solidjs/web";
import { Portal } from "@solidjs/web";

interface MacTooltipProps {
  trigger: JSX.Element;
  content: JSX.Element;
  openDelay?: number;
  closeDelay?: number;
}

export function MacTooltip(props: MacTooltipProps) {
  return (
    <Tooltip.Root openDelay={props.openDelay ?? 200} closeDelay={props.closeDelay ?? 0}>
      <Tooltip.Trigger asChild={(_triggerProps) => props.trigger}>{props.trigger}</Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content>{props.content}</Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}
