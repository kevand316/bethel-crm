'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading2,
  Quote,
  Undo,
  Redo,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function EmailEditor({ content, onChange, placeholder }: EmailEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-gold-dark underline',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Write your email content here...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-sm max-w-none',
      },
    },
  });

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        active ? 'bg-navy/10 text-navy' : 'text-navy/50 hover:bg-navy/5 hover:text-navy'
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-cream-dark rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-2 border-b border-cream-dark bg-cream/50 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <div className="w-px h-5 bg-cream-dark mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading"
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote size={16} />
        </ToolbarButton>
        <div className="w-px h-5 bg-cream-dark mx-1" />
        <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Link">
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code size={16} />
        </ToolbarButton>
        <div className="w-px h-5 bg-cream-dark mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo size={16} />
        </ToolbarButton>

        {/* Merge field buttons */}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-navy/40 mr-1">Insert:</span>
          {['first_name', 'last_name', 'email'].map((field) => (
            <button
              key={field}
              type="button"
              onClick={() =>
                editor.chain().focus().insertContent(`{{${field}}}`).run()
              }
              className="px-2 py-0.5 text-xs bg-gold/10 text-gold-dark rounded hover:bg-gold/20 transition-colors"
            >
              {`{{${field}}}`}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
