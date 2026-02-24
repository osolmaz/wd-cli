package wikidata

import (
	"fmt"
	"sort"
	"strings"
)

func Stringify(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case map[string]any:
		if values, ok := typed["values"]; ok {
			items, ok := values.([]any)
			if ok {
				formatted := make([]string, 0, len(items))
				for _, item := range items {
					itemMap, _ := item.(map[string]any)
					formatted = append(formatted, Stringify(itemMap["value"]))
				}
				return strings.Join(formatted, ", ")
			}
		}
		if raw, ok := typed["value"]; ok {
			return Stringify(raw)
		}
		if raw, ok := typed["string"]; ok {
			return Stringify(raw)
		}
		if qid, ok := typed["QID"].(string); ok && qid != "" {
			label, _ := typed["label"].(string)
			if strings.TrimSpace(label) == "" {
				return qid
			}
			return fmt.Sprintf("%s (%s)", label, qid)
		}
		if pid, ok := typed["PID"].(string); ok && pid != "" {
			label, _ := typed["label"].(string)
			if strings.TrimSpace(label) == "" {
				return pid
			}
			return fmt.Sprintf("%s (%s)", label, pid)
		}
		if amount, ok := typed["amount"]; ok {
			unit, _ := typed["unit"].(string)
			text := fmt.Sprintf("%v", amount)
			if strings.TrimSpace(unit) != "" {
				text += " " + unit
			}
			return strings.TrimSpace(text)
		}
		// Stable fallback for unknown objects.
		keys := make([]string, 0, len(typed))
		for key := range typed {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		parts := make([]string, 0, len(keys))
		for _, key := range keys {
			parts = append(parts, fmt.Sprintf("%s=%s", key, Stringify(typed[key])))
		}
		return strings.Join(parts, ", ")
	case string:
		return typed
	case fmt.Stringer:
		return typed.String()
	default:
		return fmt.Sprintf("%v", typed)
	}
}

func stringifyQualifier(q textifierQualifier) string {
	values := make([]string, 0, len(q.Values))
	for _, v := range q.Values {
		values = append(values, Stringify(v.Value))
	}
	return strings.Join(values, ", ")
}

func TripletValuesToString(entityID string, propertyID string, entity textifierEntity) string {
	if len(entity.Claims) == 0 {
		return ""
	}

	var b strings.Builder
	for claimIndex, claim := range entity.Claims {
		for valueIndex, claimValue := range claim.Values {
			if claimIndex > 0 || valueIndex > 0 {
				b.WriteString("\n")
			}

			property := claim.PID
			if strings.TrimSpace(property) == "" {
				property = propertyID
			}

			entityLabel := strings.TrimSpace(entity.Label)
			if entityLabel == "" {
				entityLabel = entityID
			}

			b.WriteString(entityLabel)
			b.WriteString(" (")
			b.WriteString(entityID)
			b.WriteString("): ")
			b.WriteString(claim.PropertyLabel)
			b.WriteString(" (")
			b.WriteString(property)
			b.WriteString("): ")
			b.WriteString(Stringify(claimValue.Value))
			b.WriteString("\n")

			rank := strings.TrimSpace(claimValue.Rank)
			if rank == "" {
				rank = "normal"
			}
			b.WriteString("  Rank: ")
			b.WriteString(rank)
			b.WriteString("\n")

			if len(claimValue.Qualifiers) > 0 {
				b.WriteString("  Qualifier:\n")
				for _, qualifier := range claimValue.Qualifiers {
					b.WriteString("    - ")
					b.WriteString(qualifier.PropertyLabel)
					b.WriteString(" (")
					b.WriteString(qualifier.PID)
					b.WriteString("): ")
					b.WriteString(stringifyQualifier(qualifier))
					b.WriteString("\n")
				}
			}

			if len(claimValue.References) > 0 {
				for referenceIndex, referenceClaims := range claimValue.References {
					b.WriteString("  Reference ")
					b.WriteString(fmt.Sprintf("%d", referenceIndex+1))
					b.WriteString(":\n")
					for _, refClaim := range referenceClaims {
						b.WriteString("    - ")
						b.WriteString(refClaim.PropertyLabel)
						b.WriteString(" (")
						b.WriteString(refClaim.PID)
						b.WriteString("): ")
						b.WriteString(stringifyQualifier(refClaim))
						b.WriteString("\n")
					}
				}
			}
		}
	}

	return strings.TrimSpace(b.String())
}
