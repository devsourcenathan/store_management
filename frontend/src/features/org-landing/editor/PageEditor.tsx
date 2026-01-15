import React, { useState } from 'react';
import { Control, useFieldArray, useFormContext } from 'react-hook-form';
import { OrganizationLandingData, Section } from '@/types/landing';
import { Canvas } from './Canvas';
import { Sidebar } from './Sidebar';
import { InspectorPanel } from './InspectorPanel';
import { sectionPresets, blockPresets } from './presets'; // Import blockPresets

interface PageEditorProps {
  control: Control<OrganizationLandingData>;
  sections: Section[];
}

export const PageEditor: React.FC<PageEditorProps> = ({ control, sections }) => {
  const { fields, append, remove, move, update } = useFieldArray({
    control,
    name: 'sections',
  });
  const { getValues } = useFormContext();

  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'section' | 'block' } | null>(null);

  const addSection = (type: keyof typeof sectionPresets) => {
    if (sectionPresets[type]) {
      const newSection = sectionPresets[type]();
      append(newSection);
    }
  };
  
  const addBlock = (sectionIndex: number, blockType: keyof typeof blockPresets) => {
    if (blockPresets[blockType]) {
        const newBlock = blockPresets[blockType]();
        const section = getValues(`sections.${sectionIndex}`);
        const updatedBlocks = [...section.blocks, newBlock];
        update(sectionIndex, { ...section, blocks: updatedBlocks });
    }
  };

  const deleteBlock = (sectionIndex: number, blockIndex: number) => {
    const section = getValues(`sections.${sectionIndex}`);
    const updatedBlocks = section.blocks.filter((_, idx) => idx !== blockIndex);
    update(sectionIndex, { ...section, blocks: updatedBlocks });
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    if (result.type === 'section') {
      move(result.source.index, result.destination.index);
    }
    // Block reordering can be added later
  };

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar addSection={addSection} addBlock={addBlock} selectedItem={selectedItem} />

      <Canvas
        sections={fields as Section[]}
        removeSection={remove}
        deleteBlock={deleteBlock}
        onDragEnd={onDragEnd}
        setSelectedItem={setSelectedItem}
      />

      <InspectorPanel selectedItem={selectedItem} />
    </div>
  );
};

