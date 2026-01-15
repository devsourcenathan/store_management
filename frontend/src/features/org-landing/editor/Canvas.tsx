import React from 'react';
import { Section, Block } from '@/types/landing';
import { Section as SectionComponent } from './Section';
import { Block as BlockComponent } from './Block';
import { DndContext, DragEndEvent, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

// SortableSection component for drag and drop
interface SortableSectionProps {
  section: Section;
  sectionIndex: number;
  removeSection: (index: number) => void;
  deleteBlock: (sectionIndex: number, blockIndex: number) => void;
  setSelectedItem: (item: { id: string; type: 'section' | 'block' } | null) => void;
}

const SortableSection: React.FC<SortableSectionProps> = ({ section, sectionIndex, removeSection, deleteBlock, setSelectedItem }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, data: { type: 'section', section } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.7 : 1,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this section?')) {
      removeSection(sectionIndex);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setSelectedItem({ id: section.id, type: 'section' })}
      className="relative group"
    >
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <SectionComponent id={section.id} type={section.type} settings={section.settings}>
        {section.blocks.map((block, blockIndex) => (
          <BlockComponent
            key={block.id}
            id={block.id}
            type={block.type}
            content={block.content}
            style={block.style || {}}
            onClick={(e) => { e.stopPropagation(); setSelectedItem({ id: block.id, type: 'block' }); }}
            onDelete={(e) => {
              e.stopPropagation();
              if (window.confirm('Are you sure you want to delete this block?')) {
                deleteBlock(sectionIndex, blockIndex);
              }
            }}
          />
        ))}
      </SectionComponent>
    </div>
  );
};

interface CanvasProps {
  sections: Section[];
  removeSection: (index: number) => void;
  deleteBlock: (sectionIndex: number, blockIndex: number) => void;
  onDragEnd: (event: DragEndEvent) => void;
  setSelectedItem: (item: { id: string; type: 'section' | 'block' } | null) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ sections, removeSection, deleteBlock, onDragEnd, setSelectedItem }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
  );

  return (
    <div className="flex-1 p-4 bg-gray-100 overflow-auto">
      <h2 className="text-xl font-semibold mb-4 sr-only">Canvas Area</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={sections.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            className="min-h-[calc(100vh-120px)] border-dashed border-2 border-gray-300 p-4 flex flex-col gap-4 relative"
            onClick={() => setSelectedItem(null)}
          >
            {sections.length === 0 ? (
              <p className="text-gray-500 text-center py-20">
                Add a new section from the sidebar to get started.
              </p>
            ) : (
              sections.map((section, index) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  sectionIndex={index}
                  removeSection={removeSection}
                  deleteBlock={deleteBlock}
                  setSelectedItem={setSelectedItem}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
