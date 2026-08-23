import { Extension } from '@tiptap/core';

export const CustomShortcuts = Extension.create({
  name: 'customShortcuts',

  addKeyboardShortcuts() {
    return {
      'Ctrl-z': () => this.editor.commands.undo(),
      'Ctrl-Shift-z': () => this.editor.commands.redo(),
      'Ctrl-y': () => this.editor.commands.redo(),
    };
  },
});
