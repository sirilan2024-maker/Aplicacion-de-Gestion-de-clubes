import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { COLORS, getContrastColor } from '@/lib/constants';

interface ColorSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ColorSelect({ value, onChange }: ColorSelectProps) {
  const selected = COLORS.find((c) => c.value === value) ?? COLORS[0];
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button className="relative w-full cursor-default rounded border border-gray-300 bg-white py-2 pl-3 pr-10 text-left focus:outline-none">
          <span className="flex items-center">
            <span className="inline-block w-4 h-4 mr-2 rounded" style={{ backgroundColor: selected.value }}></span>
            <span className="block truncate" style={{ color: getContrastColor(selected.value) }}>{selected.name}</span>
          </span>
        </Listbox.Button>
        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="grid grid-cols-4 gap-2 p-2">
              {COLORS.map((col) => (
                <Listbox.Option key={col.value} value={col.value} className={({ active }) => `cursor-pointer select-none rounded p-1 ${active ? 'bg-gray-100' : ''}`}>
                  {({ selected }) => (
                    <div className="flex items-center">
                      <span className="inline-block w-4 h-4 mr-2 rounded" style={{ backgroundColor: col.value }}></span>
                      <span className="text-sm" style={{ color: getContrastColor(col.value) }}>{col.name}</span>
                    </div>
                  )}
                </Listbox.Option>
              ))}
            </div>
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
