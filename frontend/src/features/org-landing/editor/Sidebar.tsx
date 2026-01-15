import React from 'react';
import { useFormContext } from 'react-hook-form';
import { availablePresets, sectionPresets, availableBlockPresets, blockPresets } from './presets';
import { Button } from '@/components/ui/button';
import { OrganizationLandingData } from '@/types/landing';

const formatPresetName = (name: string) => {
  return name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

interface SidebarProps {
  addSection: (type: keyof typeof sectionPresets) => void;
  addBlock: (sectionIndex: number, blockType: keyof typeof blockPresets) => void;
  selectedItem: { id: string; type: 'section' | 'block' } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ addSection, addBlock, selectedItem }) => {
  const { watch } = useFormContext<OrganizationLandingData>();
  const sections = watch('sections');

  let selectedSectionIndex = -1;
  if (selectedItem) {
    if (selectedItem.type === 'section') {
      selectedSectionIndex = sections.findIndex(s => s.id === selectedItem.id);
    } else { // It's a block, find its parent section
      selectedSectionIndex = sections.findIndex(s => s.blocks.some(b => b.id === selectedItem.id));
    }
  }

  return (
    <div className="w-64 border-r p-4 bg-white flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Add Content</h2>
      
      {/* Add Sections */}
      <div className="space-y-2">
        <h3 className="text-md font-medium text-gray-700">Sections</h3>
        {availablePresets.map((presetName) => (
          <Button
            key={presetName}
            variant="outline"
            className="w-full justify-start"
            onClick={() => addSection(presetName as keyof typeof sectionPresets)}
          >
            + Add {formatPresetName(presetName)}
          </Button>
        ))}
      </div>

      {/* Add Blocks */}
      <div className="space-y-2 mt-6">
        <h3 className="text-md font-medium text-gray-700">Blocks</h3>
        {selectedSectionIndex !== -1 ? (
          <>
            <p className="text-sm text-gray-500">Add to selected section:</p>
            {availableBlockPresets.map((presetName) => (
              <Button
                key={presetName}
                variant="outline"
                className="w-full justify-start"
                onClick={() => addBlock(selectedSectionIndex, presetName as keyof typeof blockPresets)}
              >
                + Add {formatPresetName(presetName)}
              </Button>
            ))}
          </>
        ) : (
          <p className="text-sm text-gray-500">Select a section on the canvas to add blocks to it.</p>
        )}
      </div>
    </div>
  );
};
