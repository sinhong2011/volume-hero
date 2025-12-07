import { Slider } from "@ark-ui/solid/slider";
import type { JSX } from "solid-js";
import { Show } from "solid-js";

interface MacSliderProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string | JSX.Element;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  volumeLevel?: "safe" | "warning" | "danger";
  class?: string;
}

export function MacSlider(props: MacSliderProps) {
  const min = () => props.min ?? 0;
  const max = () => props.max ?? 100;
  const step = () => props.step ?? 1;

  const handleChange = (details: { value: number[] }) => {
    props.onChange?.(details.value[0]);
  };

  return (
    <Slider.Root
      value={[props.value]}
      onValueChange={handleChange}
      min={min()}
      max={max()}
      step={step()}
      class={props.class}
    >
      <Show when={props.label || props.showValue}>
        <div class="flex justify-between items-center mb-2">
          <Show when={props.label}>
            <Slider.Label class="text-[13px] text-macos-text">{props.label}</Slider.Label>
          </Show>
          <Show when={props.showValue}>
            <Slider.ValueText class="text-[13px] font-medium text-macos-accent tabular-nums">
              {props.valueFormatter ? props.valueFormatter(props.value) : `${props.value}%`}
            </Slider.ValueText>
          </Show>
        </div>
      </Show>
      <Slider.Control>
        <Slider.Track>
          <Slider.Range data-volume-level={props.volumeLevel} />
        </Slider.Track>
        <Slider.Thumb index={0}>
          <Slider.HiddenInput />
        </Slider.Thumb>
      </Slider.Control>
    </Slider.Root>
  );
}
