import React from "react";

export default function CommentList({ comments = [] }) {
  const renderedComments = comments.map((comment) => {
    const status = (comment.status || "").toLowerCase();
    let content;

    if (status === "approved") {
      content = comment.content;
    } else if (status === "pending") {
      content = "This comment is awaiting";
    } else if (status === "rejected") {
      content = "This comment has been rejected";
    }

    return <li key={comment.id}>{content}</li>;
  });

  return <ul>{renderedComments}</ul>;
}
