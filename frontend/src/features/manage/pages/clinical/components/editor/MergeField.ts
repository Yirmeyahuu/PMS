import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MergeFieldComponent } from './MergeFieldComponent';

export interface MergeFieldOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mergeField: {
      /**
       * Insert a dynamic merge field
       */
      insertMergeField: (options: { id: string; label: string }) => ReturnType;
    };
  }
}

export const MergeField = Node.create<MergeFieldOptions>({
  name: 'mergeField',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-id': attributes.id,
          };
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) {
            return {};
          }
          return {
            'data-label': attributes.label,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="merge-field"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // When generating HTML for the backend, we want to output the raw {{variable}} syntax 
    // so the backend Python regex can parse it.
    // e.g. <span data-type="merge-field" data-id="{{patient.first_name}}" data-label="Patient First Name">{{patient.first_name}}</span>
    return [
      'span',
      mergeAttributes({ 'data-type': 'merge-field', class: 'merge-field-tag' }, this.options.HTMLAttributes, HTMLAttributes),
      node.attrs.id 
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MergeFieldComponent);
  },

  addCommands() {
    return {
      insertMergeField:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
