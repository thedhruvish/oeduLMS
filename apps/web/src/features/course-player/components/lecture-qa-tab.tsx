import * as React from "react";
import { ChevronDown, ChevronRight, MessageCircleQuestion, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@oedulms/ui/components/avatar";
import { Badge } from "@oedulms/ui/components/badge";
import { Button } from "@oedulms/ui/components/button";
import { Input } from "@oedulms/ui/components/input";
import { Textarea } from "@oedulms/ui/components/textarea";
import { Skeleton } from "@oedulms/ui/components/skeleton";
import { toast } from "sonner";
import {
  useAddLectureAnswer,
  useAddLectureQuestion,
  useLectureQuestions,
  type LectureQuestion,
} from "@/api/course-player";
import { getInitials } from "@/lib/helper";
import { formatRelativeTime } from "../utils";

interface LectureQaTabProps {
  courseId: string;
  lectureId: string;
}

function QuestionCard({
  question,
  courseId,
  lectureId,
}: {
  question: LectureQuestion;
  courseId: string;
  lectureId: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [answerText, setAnswerText] = React.useState("");
  const addAnswer = useAddLectureAnswer(courseId, lectureId);

  const handleAnswer = async () => {
    if (!answerText.trim()) return;
    try {
      await addAnswer.mutateAsync({
        questionId: question.id,
        content: answerText.trim(),
      });
      setAnswerText("");
      toast.success("Answer posted");
    } catch {
      toast.error("Failed to post answer");
    }
  };

  return (
    <div className="flex flex-col gap-0 border border-border/50 bg-card">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/30"
      >
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">{question.title}</h4>
            <Badge variant={question.status === "resolved" ? "default" : "secondary"}>
              {question.status}
            </Badge>
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">{question.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Avatar size="sm" className="size-4">
                {question.student.image ? (
                  <AvatarImage src={question.student.image} alt={question.student.name} />
                ) : null}
                <AvatarFallback className="text-[8px]">
                  {getInitials(question.student.name)}
                </AvatarFallback>
              </Avatar>
              {question.student.name}
            </span>
            <span>{formatRelativeTime(question.createdAt)}</span>
            <span>
              {question.answersCount} answer{question.answersCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-border/40 px-4 py-4">
          <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {question.description}
          </p>

          {question.answers.length > 0 && (
            <div className="flex flex-col gap-3">
              <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Answers
              </h5>
              {question.answers.map((answer) => (
                <div
                  key={answer.id}
                  className="flex gap-2.5 items-start rounded-none border border-border/30 bg-muted/20 p-3"
                >
                  <Avatar size="sm" className="shrink-0">
                    {answer.user.image ? (
                      <AvatarImage src={answer.user.image} alt={answer.user.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                      {getInitials(answer.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold">{answer.user.name}</span>
                      {answer.isInstructorAnswer && <Badge variant="default">Instructor</Badge>}
                      {answer.isAccepted && <Badge variant="secondary">Accepted</Badge>}
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(answer.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {answer.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" htmlFor={`answer-${question.id}`}>
              Your answer
            </label>
            <Textarea
              id={`answer-${question.id}`}
              placeholder="Write your answer..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              className="min-h-28"
              rows={4}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAnswer}
                disabled={!answerText.trim() || addAnswer.isPending}
              >
                <Send data-icon="inline-start" />
                Post answer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LectureQaTab({ courseId, lectureId }: LectureQaTabProps) {
  const { data: questions = [], isLoading } = useLectureQuestions(courseId, lectureId);
  const addQuestion = useAddLectureQuestion(courseId, lectureId);

  const [showForm, setShowForm] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");

  const handleAsk = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    try {
      await addQuestion.mutateAsync({
        title: title.trim(),
        description: description.trim(),
      });
      setTitle("");
      setDescription("");
      setShowForm(false);
      toast.success("Question posted");
    } catch {
      toast.error("Failed to post question");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Questions & Answers</h3>
          <p className="text-xs text-muted-foreground">
            Ask the instructor or classmates about this lecture.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((p) => !p)}>
          <MessageCircleQuestion data-icon="inline-start" />
          {showForm ? "Cancel" : "Ask a question"}
        </Button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-3 border border-border/50 bg-muted/10 p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="q-title" className="text-xs font-medium">
              Title
            </label>
            <Input
              id="q-title"
              placeholder="What's your question in one line?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="q-desc" className="text-xs font-medium">
              Details
            </label>
            <Textarea
              id="q-desc"
              placeholder="Add more context so others can help..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-36"
              rows={6}
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAsk}
              disabled={!title.trim() || !description.trim() || addQuestion.isPending}
            >
              <Send data-icon="inline-start" />
              Post question
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <MessageCircleQuestion className="size-8 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">
            No questions yet. Be the first to ask something about this lecture.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} courseId={courseId} lectureId={lectureId} />
          ))}
        </div>
      )}
    </div>
  );
}
