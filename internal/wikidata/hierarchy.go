package wikidata

import (
	"context"
	"fmt"
	"strings"
)

type hierarchyNode struct {
	Label      string
	InstanceOf []string
	SubclassOf []string
}

func (c *Client) GetInstanceAndSubclassHierarchy(
	ctx context.Context,
	entityID string,
	maxDepth int,
	lang string,
) (HierarchyResult, error) {
	entityID = strings.TrimSpace(entityID)
	if entityID == "" {
		return HierarchyResult{}, fmt.Errorf("entity ID cannot be empty")
	}
	if maxDepth < 0 {
		return HierarchyResult{}, fmt.Errorf("max-depth must be zero or greater")
	}
	if strings.TrimSpace(lang) == "" {
		lang = "en"
	}

	qids := []string{entityID}
	graph := map[string]hierarchyNode{}
	labels := map[string]string{}
	level := 0

	for len(qids) > 0 && level <= maxDepth {
		response, err := c.getTripletValues(ctx, qids, []string{"P31", "P279"}, textifierOptions{
			ExternalIDs: false,
			AllRanks:    false,
			References:  false,
			Qualifiers:  true,
			Lang:        lang,
		})
		if err != nil {
			return HierarchyResult{}, err
		}

		nextLevel := map[string]struct{}{}
		for _, qid := range qids {
			entity, ok := response[qid]
			if !ok {
				continue
			}

			if strings.TrimSpace(entity.Label) != "" {
				labels[qid] = entity.Label
			}

			instanceIDs, subclassIDs, discoveredLabels := extractHierarchyRelations(entity.Claims)
			for id, label := range discoveredLabels {
				if strings.TrimSpace(label) != "" {
					labels[id] = label
				}
			}

			graph[qid] = hierarchyNode{
				InstanceOf: instanceIDs,
				SubclassOf: subclassIDs,
			}

			for _, id := range instanceIDs {
				if strings.TrimSpace(id) != "" {
					nextLevel[id] = struct{}{}
				}
			}
			for _, id := range subclassIDs {
				if strings.TrimSpace(id) != "" {
					nextLevel[id] = struct{}{}
				}
			}
		}

		next := make([]string, 0, len(nextLevel))
		for id := range nextLevel {
			if _, alreadyVisited := graph[id]; alreadyVisited {
				continue
			}
			next = append(next, id)
		}

		qids = next
		level++
	}

	if _, ok := graph[entityID]; !ok {
		return HierarchyResult{
			Message: fmt.Sprintf("Entity %s not found", entityID),
		}, nil
	}

	for id, node := range graph {
		node.Label = firstNonEmpty(labels[id], id)
		graph[id] = node
	}

	rendered := hierarchyToJSON(entityID, graph, maxDepth)
	if tree, ok := rendered.(map[string]any); ok {
		return HierarchyResult{Tree: tree}, nil
	}
	return HierarchyResult{
		Tree: map[string]any{
			"result": rendered,
		},
	}, nil
}

func extractHierarchyRelations(
	claims []textifierClaim,
) ([]string, []string, map[string]string) {
	instanceIDs := []string{}
	subclassIDs := []string{}
	labels := map[string]string{}
	seenInstance := map[string]struct{}{}
	seenSubclass := map[string]struct{}{}

	for _, claim := range claims {
		target := ""
		switch claim.PID {
		case "P31":
			target = "instance"
		case "P279":
			target = "subclass"
		default:
			continue
		}

		for _, claimValue := range claim.Values {
			id, label := extractEntityIdentifier(claimValue.Value)
			if id == "" {
				continue
			}
			if strings.TrimSpace(label) != "" {
				labels[id] = label
			}

			if target == "instance" {
				if _, exists := seenInstance[id]; exists {
					continue
				}
				seenInstance[id] = struct{}{}
				instanceIDs = append(instanceIDs, id)
				continue
			}

			if _, exists := seenSubclass[id]; exists {
				continue
			}
			seenSubclass[id] = struct{}{}
			subclassIDs = append(subclassIDs, id)
		}
	}

	return instanceIDs, subclassIDs, labels
}

func extractEntityIdentifier(value any) (string, string) {
	entityMap, ok := value.(map[string]any)
	if !ok {
		return "", ""
	}

	if qid, ok := entityMap["QID"].(string); ok && strings.TrimSpace(qid) != "" {
		label, _ := entityMap["label"].(string)
		return strings.TrimSpace(qid), strings.TrimSpace(label)
	}
	if pid, ok := entityMap["PID"].(string); ok && strings.TrimSpace(pid) != "" {
		label, _ := entityMap["label"].(string)
		return strings.TrimSpace(pid), strings.TrimSpace(label)
	}
	return "", ""
}

func hierarchyToJSON(qid string, graph map[string]hierarchyNode, level int) any {
	node, ok := graph[qid]
	if !ok {
		return qid
	}
	label := firstNonEmpty(node.Label, qid)
	if level <= 0 {
		return fmt.Sprintf("%s (%s)", label, qid)
	}

	instance := make([]any, 0, len(node.InstanceOf))
	for _, instanceID := range node.InstanceOf {
		if _, exists := graph[instanceID]; !exists {
			continue
		}
		instance = append(instance, hierarchyToJSON(instanceID, graph, level-1))
	}

	subclass := make([]any, 0, len(node.SubclassOf))
	for _, subclassID := range node.SubclassOf {
		if _, exists := graph[subclassID]; !exists {
			continue
		}
		subclass = append(subclass, hierarchyToJSON(subclassID, graph, level-1))
	}

	return map[string]any{
		fmt.Sprintf("%s (%s)", label, qid): map[string]any{
			"instance of (P31)":  instance,
			"subclass of (P279)": subclass,
		},
	}
}
