import { OrderedList } from '@tiptap/extension-ordered-list';

export const CustomOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: 'decimal',
        parseHTML: element => element.style.listStyleType || 'decimal',
        renderHTML: attributes => {
          if (!attributes.listStyleType) {
            return {};
          }
          return {
            style: `list-style-type: ${attributes.listStyleType}`,
          };
        },
      },
    };
  },
});
