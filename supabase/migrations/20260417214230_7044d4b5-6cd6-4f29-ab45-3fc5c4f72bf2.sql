-- Limpa documentos de teste e reseta a numeração para começar no 1
DELETE FROM public.vet_documents;
ALTER SEQUENCE public.vet_document_number_seq RESTART WITH 1;