# Zernio Webhook Fixes - Audio Messages and Short Replies

## Problem Analysis

### 1. Audio Messages Not Being Handled
**Root Cause**: In `src/routes/api/public/zernio-webhook.ts`, lines 119-125, when `payload.message.text` was empty (which happens with audio messages), the function would simply `return;` without any response to the user.

**Expected Payload Structure for Audio Messages:**
```typescript
{
  message: {
    conversationId: string,
    text: undefined or "",  // Empty for audio messages
    id: string,
    // Other media-specific fields would be present
  },
  account: { id: string },
  channel: "whatsapp" | "instagram"
}
```

### 2. Short Replies Not Being Detected
**Root Cause**: While the `isShortReply()` function existed, it had limited variations and no logging to verify it was working correctly.

**Expected Payload Structure for Short Replies:**
```typescript
{
  message: {
    conversationId: string,
    text: "obrigado",  // The actual text message
    id: string
  },
  account: { id: string },
  channel: "whatsapp" | "instagram"
}
```

## Solutions Implemented

### 1. Audio Message Handling (Lines 125-135)
**Before:**
```typescript
if (!text) {
    // TODO: Implementar envio de mensagem de texto pedindo esclarecimento
    return;
}
```

**After:**
```typescript
if (!text) {
    console.log("[zernio-webhook] Mensagem sem texto (áudio/imagem/figurinhas):", JSON.stringify(payload.message));
    // Enviar resposta pedindo para o usuário digitar
    const reply = "Desculpe, não consigo processar áudio ou imagens. Por favor, digite sua mensagem em texto.";
    await sendZernioMessage(
        payload.message.conversationId,
        payload.account.id,
        reply,
    );
    return;
}
```

### 2. Enhanced Short Reply Detection (Lines 78-83)
**Before:**
```typescript
function isShortReply(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const emojiOnly = /^[\p{Emoji_Presentation}\p{Emoji}\s]+$/u.test(normalized);
  return ["ok", "obrigado", "obrigada", "valeu", "blz", "beleza"].includes(normalized) || emojiOnly;
}
```

**After:**
```typescript
function isShortReply(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const emojiOnly = /^[\p{Emoji_Presentation}\p{Emoji}\s]+$/u.test(normalized);
  // Adicionar mais variações comuns
  return ["ok", "obrigado", "obrigada", "valeu", "blz", "beleza", "obg", "vlw", "thanks", "thank you", "grato", "grata"].includes(normalized) || emojiOnly;
}
```

### 3. Enhanced Logging (Multiple Locations)

Added comprehensive logging throughout the flow:
- Line 96: Log when processing starts with conversation details
- Line 127: Log when non-text message is received
- Line 167: Log when short reply is detected

## Testing

### Verification Steps
1. **TypeScript Compilation**: ✅ Passed (`npx tsc --noEmit`)
2. **Unit Tests**: ✅ Passed (`npm run test:unit`)
3. **Build**: ✅ Passed (`npm run build`)

### Expected Behavior After Deployment

**Audio Message Test:**
1. User sends an audio message
2. Fran responds: "Desculpe, não consigo processar áudio ou imagens. Por favor, digite sua mensagem em texto."
3. Log shows: `[zernio-webhook] Mensagem sem texto (áudio/imagem/figurinhas): {payload}`

**Short Reply Test:**
1. User sends "obrigado" or "thanks"
2. Fran responds: "De nada! 😊"
3. Log shows: `[zernio-webhook] Resposta curta detectada: obrigado`

## Impact

- **User Experience**: Users now receive helpful responses instead of silence
- **Debugging**: Enhanced logging makes it easier to track message processing
- **Robustness**: System handles more message types gracefully
- **Backward Compatibility**: All existing functionality remains intact

## Files Modified

- `src/routes/api/public/zernio-webhook.ts`

## Deployment Notes

No database migrations or configuration changes required. The fixes are purely in the application logic and can be deployed immediately.
