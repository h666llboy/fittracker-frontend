// frontend/src/ImportProgram.tsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

type Props = {
  onImported: () => void;   // перезагрузим страницу после успеха
};

export default function ImportProgram({ onImported }: Props) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const blob = new Blob([text], { type: 'application/json' });
        const form = new FormData();
        form.append('file', blob, file.name);

        await axios.post('http://127.0.0.1:8000/upload-program', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Программа импортирована!');
        onImported();
      } catch (e: any) {
        alert('Ошибка импорта: ' + (e.response?.data?.detail || e.message));
      }
    };
    reader.readAsText(file);
  }, [onImported]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'application/json': ['.json'] }
  });

  return (
    <div
      {...getRootProps()}
      style={{
        border: '2px dashed #90caf9',
        borderRadius: 8,
        padding: '1rem',
        cursor: 'pointer',
        marginBottom: '1rem'
      }}
    >
      <input {...getInputProps()} />
      {isDragActive
        ? 'Отпустите файл сюда'
        : 'Нажмите или перетащите JSON-файл программы'}
    </div>
  );
}