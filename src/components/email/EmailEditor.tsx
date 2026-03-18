'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { useRef, useState } from 'react';
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
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: { default: 'center' },
      width: { default: '100%' },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const { align, width, src, alt, title } = HTMLAttributes;
    const margin =
      align === 'left' ? '0 auto 0 0' : align === 'right' ? '0 0 0 auto' : '0 auto';
    return [
      'img',
      {
        src,
        alt: alt || '',
        title: title || '',
        style: `display:block;width:${width || '100%'};margin:${margin}`,
      },
    ];
  },
});

export default function EmailEditor({ content, onChange, placeholder }: EmailEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-gold-dark underline' },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Write your email content here...',
      }),
      CustomImage.configure({ inline: false }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'tiptap prose prose-sm max-w-none' },
    },
  });

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const insertImageUrl = () => {
    const url = window.prompt('Enter image URL:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/email/upload-image', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url }).run();
      } else {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isImageSelected = editor.isActive('image');
  const imageAttrs = editor.getAttributes('image');

  const setImageAttr = (attrs: Record<string, string>) => {
    editor.chain().focus().updateAttributes('image', attrs).run();
  };

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
    disabled,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        'p-1.5 rounded-lg transition-all',
        active
          ? 'bg-navy/10 text-navy shadow-sm'
          : 'text-navy/40 hover:bg-navy/5 hover:text-navy',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-4 bg-cream-dark mx-1.5" />;

  return (
    <div className="border border-cream-dark rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Main Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-cream-dark bg-cream/30 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading"
        >
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote size={15} />
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Link">
          <LinkIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code size={15} />
        </ToolbarButton>
        <Divider />
        {/* Image buttons */}
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="Upload Image"
          disabled={uploading}
        >
          <ImageIcon size={15} />
        </ToolbarButton>
        <button
          type="button"
          onClick={insertImageUrl}
          title="Insert Image by URL"
          className="px-1.5 py-0.5 text-[10px] font-medium text-navy/40 hover:text-navy hover:bg-navy/5 rounded-lg transition-all"
        >
          URL
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo size={15} />
        </ToolbarButton>

        {/* Merge fields */}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[10px] text-navy/30 mr-1 uppercase tracking-wider font-semibold">
            Merge:
          </span>
          {['first_name', 'last_name', 'email'].map((field) => (
            <button
              key={field}
              type="button"
              onClick={() => editor.chain().focus().insertContent(`{{${field}}}`).run()}
              className="px-2 py-0.5 text-[10px] font-medium bg-gold/10 text-gold-dark rounded-md hover:bg-gold/20 transition-all"
            >
              {`{{${field}}}`}
            </button>
          ))}
        </div>
      </div>

      {/* Image controls bar — shown when an image is selected */}
      {isImageSelected && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-cream-dark bg-gold/5 text-xs text-navy/60">
          <span className="font-semibold text-[10px] uppercase tracking-wider text-navy/40">
            Image:
          </span>
          {/* Alignment */}
          <div className="flex items-center gap-0.5">
            {[
              { align: 'left', icon: <AlignLeft size={13} />, label: 'Left' },
              { align: 'center', icon: <AlignCenter size={13} />, label: 'Center' },
              { align: 'right', icon: <AlignRight size={13} />, label: 'Right' },
            ].map(({ align, icon, label }) => (
              <button
                key={align}
                type="button"
                title={`Align ${label}`}
                onClick={() => setImageAttr({ align })}
                className={cn(
                  'p-1 rounded transition-all',
                  imageAttrs.align === align
                    ? 'bg-navy/10 text-navy'
                    : 'text-navy/40 hover:bg-navy/5 hover:text-navy'
                )}
              >
                {icon}
              </button>
            ))}
          </div>
          <div className="w-px h-3 bg-cream-dark" />
          {/* Width presets */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-navy/40">Width:</span>
            {['25%', '50%', '75%', '100%'].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setImageAttr({ width: w })}
                className={cn(
                  'px-1.5 py-0.5 text-[10px] rounded transition-all font-medium',
                  imageAttrs.width === w
                    ? 'bg-navy/10 text-navy'
                    : 'text-navy/40 hover:bg-navy/5 hover:text-navy'
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />

      {uploading && (
        <div className="px-4 py-2 text-xs text-navy/50 border-t border-cream-dark bg-cream/20">
          Uploading image...
        </div>
      )}
    </div>
  );
}
