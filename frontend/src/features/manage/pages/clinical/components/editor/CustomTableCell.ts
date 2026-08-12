import TableCell from '@tiptap/extension-table-cell';

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor || null,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
      borderColor: {
        default: null,
        parseHTML: element => element.style.borderColor || null,
        renderHTML: attributes => {
          if (!attributes.borderColor) {
            return {};
          }
          return {
            style: `border-color: ${attributes.borderColor}`,
          };
        },
      },
    };
  },
});
