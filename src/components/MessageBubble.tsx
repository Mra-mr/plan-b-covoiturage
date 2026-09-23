import { StyleSheet, Text, View } from 'react-native';
import { formatTime } from '../lib/format';
import { colors, radii, typography } from '../theme';
import type { MessageRow } from '../types/database.types';

type Props = { message: MessageRow; mine: boolean };

/** Bulle de message : bleu à droite pour moi, blanc bordé à gauche pour l'autre. */
export function MessageBubble({ message, mine }: Props) {
  return (
    <View
      accessibilityLabel={`${mine ? 'Vous' : 'Votre interlocuteur'} : ${message.body}`}
      style={[styles.row, mine ? styles.rowMine : null]}
    >
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[typography.body, mine ? styles.textMine : null]}>{message.body}</Text>
        <Text style={[styles.time, mine ? styles.timeMine : null]}>{formatTime(message.created_at)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-start' },
  rowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleOther: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  textMine: { color: colors.surface },
  time: { ...typography.caption, fontSize: 11, alignSelf: 'flex-end' },
  timeMine: { color: colors.primarySoft },
});
