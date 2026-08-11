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
        const { selection } = state;
        
        // Try list indent first
        if (editor.can().sinkListItem('listItem')) {
          return editor.chain().sinkListItem('listItem').run();
        }

        // Otherwise indent block
        let hasChanged = false;
        tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
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
          }
        });
        return hasChanged;
      },
      outdent: () => ({ tr, state, dispatch, editor }) => {
        const { selection } = state;

        // Try list outdent first
        if (editor.can().liftListItem('listItem')) {
          return editor.chain().liftListItem('listItem').run();
        }

        // Otherwise outdent block
        let hasChanged = false;
        tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
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
