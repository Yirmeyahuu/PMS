
import { NodeViewWrapper } from '@tiptap/react';

export const MergeFieldComponent = (props: any) => {
  return (
    <NodeViewWrapper className="inline-block" as="span">
      <span 
        className="inline-flex items-center px-1.5 py-0.5 mx-0.5 bg-sky-100 text-sky-800 rounded border border-sky-200 text-sm font-medium cursor-default select-none"
        contentEditable={false}
      >
        [{props.node.attrs.label}]
      </span>
    </NodeViewWrapper>
  );
};
