-- Script pour désactiver le trigger d'audit problématique sur file_attachments
-- Ce trigger cause des erreurs de contrainte de clé étrangère

-- Désactiver le trigger d'audit sur file_attachments
DROP TRIGGER IF EXISTS audit_file_attachments ON file_attachments;

-- Modifier la contrainte user_id dans audit_logs pour permettre NULL
ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL;

-- Créer un nouveau trigger plus robuste
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
    effective_user_id INTEGER;
    changes JSONB;
    operation TEXT;
BEGIN
    -- Déterminer l'opération
    IF TG_OP = 'INSERT' THEN
        operation := 'CREATE';
        changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        operation := 'UPDATE';
        changes := to_jsonb(NEW) - to_jsonb(OLD);
    ELSIF TG_OP = 'DELETE' THEN
        operation := 'DELETE';
        changes := to_jsonb(OLD);
    END IF;

    -- Obtenir l'ID utilisateur effectif (avec gestion d'erreur)
    BEGIN
        effective_user_id := current_setting('app.current_user_id', TRUE)::INTEGER;
    EXCEPTION
        WHEN OTHERS THEN
            effective_user_id := NULL;
    END;

    -- Insérer le log d'audit seulement si on a un utilisateur valide
    IF effective_user_id IS NOT NULL THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            entity,
            entity_id,
            changes,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            effective_user_id,
            operation,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            changes,
            current_setting('app.current_ip', TRUE),
            current_setting('app.user_agent', TRUE),
            NOW()
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger sur file_attachments
CREATE TRIGGER audit_file_attachments
    AFTER INSERT OR UPDATE OR DELETE ON file_attachments
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Message de confirmation
SELECT 'Trigger d''audit corrigé avec succès' as message; 