import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { OrganizationLandingData, Section, Block } from '@/types/landing';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

interface InspectorPanelProps {
  selectedItem: { id: string; type: 'section' | 'block' } | null;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ selectedItem }) => {
  const { control, watch, setValue } = useFormContext<OrganizationLandingData>();

  if (!selectedItem) {
    return (
      <div className="w-80 border-l p-4 bg-white shrink-0 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Properties</h2>
        <p className="text-gray-600">Select a section or block on the canvas to edit its properties.</p>
        <div className="mt-8 space-y-4">
          <h3 className="text-md font-bold mb-3">Global Theme Settings</h3>
          <div className="space-y-3">
            <Label htmlFor="themeConfig.primaryColor">Primary Color</Label>
            <Controller
              name="themeConfig.primaryColor"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  <Input type="color" {...field} className="w-12 h-10 p-1" />
                  <Input type="text" {...field} placeholder="#3b82f6" />
                </div>
              )}
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="themeConfig.fontFamily">Font Family</Label>
            <Controller
              name="themeConfig.fontFamily"
              control={control}
              render={({ field }) => <Input type="text" {...field} placeholder="Inter, sans-serif" />}
            />
          </div>
        </div>
      </div>
    );
  }

  // Find the selected section or block
  const currentSections = watch('sections');
  let selectedSection: Section | undefined;
  let selectedBlock: Block | undefined;
  let sectionIndex: number = -1;
  let blockIndex: number = -1;

  if (selectedItem.type === 'section') {
    selectedSection = currentSections.find(s => s.id === selectedItem.id);
    sectionIndex = currentSections.findIndex(s => s.id === selectedItem.id);
  } else { // selectedItem.type === 'block'
    for (let i = 0; i < currentSections.length; i++) {
      const section = currentSections[i];
      const block = section.blocks.find(b => b.id === selectedItem.id);
      if (block) {
        selectedSection = section;
        selectedBlock = block;
        sectionIndex = i;
        blockIndex = section.blocks.findIndex(b => b.id === selectedItem.id);
        break;
      }
    }
  }

  const renderSectionProperties = (section: Section, idx: number) => (
    <>
      <div className="space-y-3">
        <Label htmlFor="sectionType">Type</Label>
        <Input id="sectionType" value={section.type} readOnly className="font-mono" />
      </div>
      <div className="space-y-3">
        <Label htmlFor={`sections.${idx}.settings.backgroundColor`}>Background Color</Label>
        <Controller
          name={`sections.${idx}.settings.backgroundColor`}
          control={control}
          render={({ field }) => (
            <div className="flex gap-2">
              <Input type="color" {...field} className="w-12 h-10 p-1" />
              <Input type="text" {...field} placeholder="#FFFFFF" />
            </div>
          )}
        />
      </div>
      <div className="space-y-3">
        <Label htmlFor={`sections.${idx}.settings.padding`}>Padding</Label>
        <Controller
          name={`sections.${idx}.settings.padding`}
          control={control}
          render={({ field }) => (
            <Input type="text" {...field} placeholder="e.g., 20px 0" />
          )}
        />
      </div>
      {/* Add more section specific settings here */}
    </>
  );

  const renderBlockProperties = (block: Block, secIdx: number, blkIdx: number) => (
    <>
      <div className="space-y-3">
        <Label htmlFor="blockType">Type</Label>
        <Input id="blockType" value={block.type} readOnly className="font-mono" />
      </div>

      {(block.type === 'heading' || block.type === 'paragraph') && (
        <div className="space-y-3">
          <Label htmlFor={`sections.${secIdx}.blocks.${blkIdx}.content.text`}>Text</Label>
          <Controller
            name={`sections.${secIdx}.blocks.${blkIdx}.content.text`}
            control={control}
            render={({ field }) => <Input type="text" {...field} />}
          />
        </div>
      )}

      {block.type === 'image' && (
        <>
          <div className="space-y-3">
            <Label htmlFor={`sections.${secIdx}.blocks.${blkIdx}.content.src`}>Image URL</Label>
            <Controller
              name={`sections.${secIdx}.blocks.${blkIdx}.content.src`}
              control={control}
              render={({ field }) => <Input type="text" {...field} />}
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor={`sections.${secIdx}.blocks.${blkIdx}.content.alt`}>Alt Text</Label>
            <Controller
              name={`sections.${secIdx}.blocks.${blkIdx}.content.alt`}
              control={control}
              render={({ field }) => <Input type="text" {...field} />}
            />
          </div>
        </>
      )}

      {block.type === 'button' && (
        <>
          <div className="space-y-3">
            <Label htmlFor={`sections.${secIdx}.blocks.${blkIdx}.content.text`}>Button Text</Label>
            <Controller
              name={`sections.${secIdx}.blocks.${blkIdx}.content.text`}
              control={control}
              render={({ field }) => <Input type="text" {...field} />}
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor={`sections.${secIdx}.blocks.${blkIdx}.content.href`}>Link URL</Label>
            <Controller
              name={`sections.${secIdx}.blocks.${blkIdx}.content.href`}
              control={control}
              render={({ field }) => <Input type="text" {...field} />}
            />
          </div>
        </>
      )}
      
      {block.type === 'rich-text' && (
        <div className="space-y-3">
          <Label htmlFor={`sections.${secIdx}.blocks.${blkIdx}.content.html`}>Content</Label>
          <Controller
            name={`sections.${secIdx}.blocks.${blkIdx}.content.html`}
            control={control}
            render={({ field }) => (
              <div className="bg-white text-black rounded-md">
                <ReactQuill
                  theme="snow"
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              </div>
            )}
          />
        </div>
      )}

      {/* Generic style properties for blocks */}
      <div className="space-y-3 border-t pt-4 mt-4">
        <h3 className="text-md font-medium text-gray-700">Block Styles</h3>
        <Label htmlFor={`sections.${secIdx}.blocks.${blkIdx}.style.fontSize`}>Font Size</Label>
        <Controller
          name={`sections.${secIdx}.blocks.${blkIdx}.style.fontSize`}
          control={control}
          render={({ field }) => <Input type="text" {...field} placeholder="e.g., 16px" />}
        />
        <Label htmlFor={`sections.${secIdx}.blocks.${blkIdx}.style.color`}>Color</Label>
        <Controller
          name={`sections.${secIdx}.blocks.${blkIdx}.style.color`}
          control={control}
          render={({ field }) => (
            <div className="flex gap-2">
              <Input type="color" {...field} className="w-12 h-10 p-1" />
              <Input type="text" {...field} placeholder="#333333" />
            </div>
          )}
        />
        {/* Add more common style properties like padding, margin, textAlign */}
        <Label htmlFor={`sections.${secIdx}.blocks.${blkIdx}.style.textAlign`}>Text Align</Label>
        <Controller
          name={`sections.${secIdx}.blocks.${blkIdx}.style.textAlign`}
          control={control}
          render={({ field }) => <Input type="text" {...field} placeholder="left, center, right" />}
        />
      </div>
    </>
  );

  return (
    <div className="w-80 border-l p-4 bg-white shrink-0 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Properties</h2>
      {selectedSection && (
        <>
          <h3 className="text-md font-bold mb-3">
            {selectedItem.type === 'section' ? `Section: ${selectedSection.type}` : `Block: ${selectedBlock?.type}`}
            <span className="text-gray-500 text-sm ml-2">(ID: {selectedItem.id.substring(0, 8)})</span>
          </h3>
          {selectedItem.type === 'section' && renderSectionProperties(selectedSection, sectionIndex)}
          {selectedItem.type === 'block' && selectedBlock && renderBlockProperties(selectedBlock, sectionIndex, blockIndex)}
        </>
      )}
    </div>
  );
};

