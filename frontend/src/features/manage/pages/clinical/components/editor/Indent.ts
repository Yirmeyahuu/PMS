import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

export const Indent = Extension.create({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      minLevel: 0,
      maxLevel: 8,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: element => {
              const paddingLeft = element.style.paddingLeft || element.style.marginLeft;
              if (paddingLeft) {
                const value = parseInt(paddingLeft, 10);
                return Math.floor(value / 30);
              }
              return 0;
            },
            renderHTML: attributes => {
              if (!attributes.indent) {
                return {};
              }
              return {
                style: `padding-left: ${attributes.indent * 30}px`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent: () => ({ tr, state, dispatch, editor }) => {
        // Safely check if we can sink a list item
        const canSink = editor.can().sinkListItem('listItem');
        
        if (canSink) {
          if (dispatch) {
            editor.commands.sinkListItem('listItem');
          }
          return true;
        }

        // Otherwise indent block
        const { selection } = state;
        const nodes: { pos: number; node: any }[] = [];
        tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            nodes.push({ pos, node });
          }
        });

        let hasChanged = false;
        nodes.forEach(({ pos, node }) => {
          const currentIndent = node.attrs.indent || 0;
          if (currentIndent < this.options.maxLevel) {
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent: currentIndent + 1,
              });
            }
            hasChanged = true;
          }
        });
        return hasChanged;
      },
      outdent: () => ({ tr, state, dispatch, editor }) => {
        // Safely check if we can lift a list item
        const canLift = editor.can().liftListItem('listItem');
        
        if (canLift) {
          if (dispatch) {
            editor.commands.liftListItem('listItem');
          }
          return true;
        }

        // Otherwise outdent block
        const { selection } = state;
        const nodes: { pos: number; node: any }[] = [];
        tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            nodes.push({ pos, node });
          }
        });

        let hasChanged = false;
        nodes.forEach(({ pos, node }) => {
          const currentIndent = node.attrs.indent || 0;
          if (currentIndent > this.options.minLevel) {
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent: currentIndent - 1,
              });
            }
            hasChanged = true;
          }
        });
        
        return hasChanged;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.indent(),
      'Shift-Tab': () => this.editor.commands.outdent(),
    };
  },
});
