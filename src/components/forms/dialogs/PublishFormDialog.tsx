'use client';

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useFormPublishing, FormPublishConfig } from "@/hooks/forms/use-form-publishing";
import { slugify } from "@/lib/utils/string-utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PublishFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formTitle: string;
  formDescription: string;
  onPublished: (slug: string) => void;
}

export function PublishFormDialog({
  open,
  onOpenChange,
  formTitle,
  formDescription,
  onPublished
}: PublishFormDialogProps) {
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const { isPublishing, publishForm } = useFormPublishing();
  const { user } = useAuth();

  // Actualizar título y slug cuando se abre el diálogo
  useEffect(() => {
    if (open && formTitle) {
      setTitle(formTitle);
      setSlug(slugify(formTitle));
    }
  }, [open, formTitle]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    const newSlug = slugify(newTitle);
    setSlug(newSlug);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    const newSlug = slugify(value);
    setSlug(newSlug);
  };

  const handlePublish = async () => {
    if (!user) {
      toast.error("Debes iniciar sesión para publicar");
      return;
    }

    if (isPublishing) {
      return;
    }

    try {
      const formConfig: FormPublishConfig = {
        title: title.trim(),
        description: formDescription.trim(),
        fields: [], // Aquí deberías pasar los campos del formulario
        theme: 'light' as const,
        customization: {
          colors: {
            primary: '#000000'
          }
        }
      };

      const url = await publishForm(formConfig);
      
      // Mostrar mensaje de éxito con acciones
      toast.success("Formulario publicado exitosamente", {
        action: {
          label: "Ver formulario",
          onClick: () => window.open(url, '_blank')
        },
        duration: 5000
      });

      // Cerrar el diálogo y notificar
      onPublished(url);
      onOpenChange(false);
    } catch (error) {
      console.error('Error al publicar:', error);
      toast.error("Error al publicar el formulario");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Publicar Formulario</DialogTitle>
          <DialogDescription>
            Configura la URL pública de tu formulario. Esta URL será accesible para tus clientes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título del Formulario</Label>
            <Input
              id="title"
              value={title}
              onChange={handleTitleChange}
              placeholder="Mi Formulario"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">
              URL del Formulario
              <span className="text-sm text-gray-500 ml-2">
                (solo letras, números y guiones)
              </span>
            </Label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-500">/forms/</span>
              <Input
                id="slug"
                value={slug}
                onChange={handleSlugChange}
                placeholder="mi-formulario"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handlePublish}
            disabled={!slug || isPublishing}
          >
            {isPublishing ? 'Publicando...' : 'Publicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 