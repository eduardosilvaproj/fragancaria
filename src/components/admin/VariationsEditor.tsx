import { Plus, Trash2 } from "lucide-react";
import { ImageUploader } from "./ImageUploader";

export interface VariationForm {
  id: string;
  name: string;
  color: string;
  image: string;
}

export function newVariation(): VariationForm {
  return { id: crypto.randomUUID().slice(0, 8), name: "", color: "", image: "" };
}

interface VariationsEditorProps {
  value: VariationForm[];
  onChange: (variations: VariationForm[]) => void;
}

export function VariationsEditor({ value, onChange }: VariationsEditorProps) {
  const update = (id: string, patch: Partial<VariationForm>) =>
    onChange(value.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const remove = (id: string) => onChange(value.filter((v) => v.id !== id));

  const add = () => onChange([...value, newVariation()]);

  return (
    <div className="space-y-4">
      {value.map((v, index) => (
        <div
          key={v.id}
          className="border border-[#E9E1D2] p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">
                Nome da variação * (ex.: Loiro Dourado 7.3)
              </label>
              <input
                type="text"
                value={v.name}
                onChange={(e) => update(v.id, { name: e.target.value })}
                placeholder={`Variação ${index + 1}`}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-[#8A938E]">Cor (opcional)</label>
              <input
                type="color"
                value={v.color || "#000000"}
                onChange={(e) => update(v.id, { color: e.target.value })}
                className="h-8 w-12 border border-[#E9E1D2] cursor-pointer p-0"
              />
              {v.color ? (
                <button
                  type="button"
                  onClick={() => update(v.id, { color: "" })}
                  className="text-xs text-[#8A938E] hover:text-[#51635F] underline"
                >
                  remover cor
                </button>
              ) : (
                <span className="text-xs text-[#8A938E]">sem cor</span>
              )}
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Foto (opcional)</label>
              <ImageUploader
                value={v.image ? [v.image] : []}
                onChange={(urls) => update(v.id, { image: urls[0] ?? "" })}
                maxImages={1}
                folder="variants"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => remove(v.id)}
            title="Remover variação"
            className="p-2 hover:bg-red-50 rounded transition-colors justify-self-end"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2 px-4 py-2 text-sm border border-[#B07B1E] text-[#B07B1E] hover:bg-amber-50 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Adicionar variação
      </button>
    </div>
  );
}
