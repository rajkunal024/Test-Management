import { useQuery } from "@tanstack/react-query";
import { getAllTests, getSubjects, getSubTopicsByTopics, getTestById, getTopicsBySubject } from "../services/api";

export const useTests = () =>
  useQuery({
    queryKey: ["tests"],
    queryFn: getAllTests,
  });

export const useTest = (id?: string) =>
  useQuery({
    queryKey: ["tests", id],
    queryFn: () => getTestById(id ?? ""),
    enabled: Boolean(id),
  });

export const useSubjects = () =>
  useQuery({
    queryKey: ["subjects"],
    queryFn: getSubjects,
  });

export const useTopics = (subjectId?: string) =>
  useQuery({
    queryKey: ["topics", subjectId],
    queryFn: () => getTopicsBySubject(subjectId ?? ""),
    enabled: Boolean(subjectId),
  });

export const useSubTopics = (topicIds: string[]) =>
  useQuery({
    queryKey: ["subTopics", topicIds],
    queryFn: () => getSubTopicsByTopics(topicIds),
    enabled: topicIds.length > 0,
  });
